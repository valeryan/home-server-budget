/**
 * matchEngine.ts
 *
 * Core matching logic for Teller-synced transactions.
 *
 * Responsibilities:
 *   1. Apply match rules (pattern + amount range) to a raw transaction description
 *   2. Assign category and/or claim a recurring item when a rule fires
 *   3. Fall back to the TellerInsights cache, then Ollama, when no rule matches
 *   4. Return a structured MatchResult for the sync route to act on
 */

import type { Payload } from 'payload'
import { getOrCreateInsight } from '@/integrations/ollama/insight'

// ── Types ──────────────────────────────────────────────────────────────────

export interface RawTellerTransaction {
  id: string // Teller's transaction ID
  account_id: string
  date: string // ISO date string, e.g. "2026-04-10"
  description: string // Raw description from the bank
  amount: string // Teller returns amounts as strings (negative = debit)
  type: 'card_payment' | 'ach' | 'transfer' | 'deposit' | 'withdrawal' | 'wire' | 'check' | 'other'
  status: 'posted' | 'pending'
  details: {
    processing_status?: string
    counterparty?: {
      name?: string
      type?: string
    }
    category?: string
  }
}

export interface TellerAccount {
  id: string
  name: string
  last_four: string
  type: string
  subtype: string
  status: string
  institution: {
    name: string
    id: string
  }
}

export type MatchConfidence = 'auto_rule' | 'auto_ai' | 'unmatched'

export interface MatchResult {
  tellerTransactionId: string
  date: string
  description: string
  /** Positive number — direction is handled separately */
  amount: number
  /** Derived from Teller type + sign of amount */
  transactionType: 'income' | 'expense' | 'transfer'
  matchConfidence: MatchConfidence
  /** Payload recurring-items ID */
  recurringItemId: string | null
  /** Payload expense-categories ID */
  expenseCategoryId: string | null
  /** Payload income-categories ID */
  incomeCategoryId: string | null
  /** Payload payees ID */
  payeeId: string | null
  /** Clean display name (payee name or AI suggestion) */
  displayTitle: string | null
  /** Human-readable label for the match source */
  matchLabel: string | null
}

// ── Pattern matching ────────────────────────────────────────────────────────

function descriptionMatches(pattern: string, description: string): boolean {
  const trimmed = pattern.trim()
  // Treat /pattern/flags as a regex literal
  const regexMatch = trimmed.match(/^\/(.+)\/([gimsuy]*)$/)
  if (regexMatch) {
    try {
      const re = new RegExp(regexMatch[1], regexMatch[2] || 'i')
      return re.test(description)
    } catch {
      return false
    }
  }
  // Plain substring match (case-insensitive)
  return description.toLowerCase().includes(trimmed.toLowerCase())
}

// ── Derive transaction type from Teller data ────────────────────────────────

function deriveTellerTransactionType(
  tellerType: RawTellerTransaction['type'],
  amountNum: number,
): 'income' | 'expense' | 'transfer' {
  if (tellerType === 'transfer' || tellerType === 'wire') return 'transfer'
  // Teller: negative amount = money leaving the account (debit)
  return amountNum < 0 ? 'expense' : 'income'
}

// ── Main engine ─────────────────────────────────────────────────────────────

export async function matchTransaction(
  payload: Payload,
  raw: RawTellerTransaction,
  skipAI = false,
): Promise<MatchResult> {
  const amountNum = parseFloat(raw.amount)
  const absAmount = Math.abs(amountNum)
  const transactionType = deriveTellerTransactionType(raw.type, amountNum)

  const base: MatchResult = {
    tellerTransactionId: raw.id,
    date: raw.date,
    description: raw.details?.counterparty?.name || raw.description,
    amount: absAmount,
    transactionType,
    matchConfidence: 'unmatched',
    recurringItemId: null,
    expenseCategoryId: null,
    incomeCategoryId: null,
    payeeId: null,
    displayTitle: null,
    matchLabel: null,
  }

  // Load active rules sorted by priority descending
  const rulesResult = await payload.find({
    collection: 'match-rules',
    where: { isActive: { equals: true } },
    sort: '-priority',
    limit: 200,
  })

  for (const rule of rulesResult.docs) {
    if (!descriptionMatches(rule.descriptionPattern as string, base.description)) continue

    // Type filter
    if (
      rule.transactionType &&
      rule.transactionType !== 'any' &&
      rule.transactionType !== transactionType
    )
      continue

    // Amount range filter
    if (typeof rule.amountMin === 'number' && absAmount < rule.amountMin) continue
    if (typeof rule.amountMax === 'number' && absAmount > rule.amountMax) continue

    // Rule matched — apply it
    const recurringItemId = rule.recurringItem
      ? typeof rule.recurringItem === 'string'
        ? rule.recurringItem
        : (rule.recurringItem as { id: string }).id
      : null
    const expenseCategoryId = rule.expenseCategory
      ? typeof rule.expenseCategory === 'string'
        ? rule.expenseCategory
        : (rule.expenseCategory as { id: string }).id
      : null
    const incomeCategoryId = rule.incomeCategory
      ? typeof rule.incomeCategory === 'string'
        ? rule.incomeCategory
        : (rule.incomeCategory as { id: string }).id
      : null
    const rulePayeeId = rule.payee
      ? typeof rule.payee === 'string'
        ? rule.payee
        : (rule.payee as { id: string }).id
      : null
    const rulePayeeName = rule.payee
      ? typeof rule.payee === 'object' && rule.payee !== null
        ? ((rule.payee as { name?: string }).name ?? null)
        : null
      : null

    return {
      ...base,
      matchConfidence: 'auto_rule',
      recurringItemId,
      expenseCategoryId,
      incomeCategoryId,
      payeeId: rulePayeeId,
      displayTitle: rulePayeeName,
      matchLabel: rule.name as string,
    }
  }

  // No rule matched — check insight cache, then call Ollama
  if (transactionType !== 'transfer') {
    const insight = await getOrCreateInsight(
      payload,
      raw,
      base.description,
      transactionType,
      absAmount,
      skipAI,
    )

    if (insight && insight.status !== 'rejected') {
      const confidence: MatchConfidence = insight.status === 'accepted' ? 'auto_rule' : 'auto_ai'
      const label =
        insight.status === 'accepted'
          ? `Accepted: ${insight.payeeName || base.description}`
          : `AI → ${insight.payeeName || base.description}`

      return {
        ...base,
        matchConfidence: confidence,
        expenseCategoryId: insight.expenseCategoryId,
        incomeCategoryId: insight.incomeCategoryId,
        recurringItemId: insight.recurringItemId,
        payeeId: insight.payeeId,
        displayTitle: insight.payeeName,
        matchLabel: label,
      }
    }
  }

  return base
}
