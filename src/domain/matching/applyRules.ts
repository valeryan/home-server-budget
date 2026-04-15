/**
 * applyMatchRules
 *
 * Core logic for matching transactions against match-rules and applying the results.
 *
 * Three exported functions:
 *  - matchesRule          — pure predicate, no DB
 *  - findMatchingRule     — finds the highest-priority active rule for a transaction
 *  - applyRuleToAllMatching — backfills ALL transactions when a rule is created/updated
 *  - applyMatchRules      — applies all active rules to transactions in a budget period
 */

import type { Payload } from 'payload'
import type { Where } from 'payload'

export interface MatchRule {
  id: string
  name: string
  descriptionPattern: string
  transactionType?: string | null
  amountMin?: number | null
  amountMax?: number | null
  payee?: { id: string; name?: string | null } | string | null
  expenseCategory?: { id: string } | string | null
  incomeCategory?: { id: string } | string | null
  recurringItem?: { id: string } | string | null
  priority?: number | null
  isActive?: boolean | null
}

function resolveId(rel: unknown): string | null {
  if (!rel) return null
  if (typeof rel === 'string') return rel
  if (typeof rel === 'object' && 'id' in (rel as object)) return (rel as { id: string }).id
  return null
}

function resolveName(rel: unknown): string | null {
  if (!rel) return null
  if (typeof rel === 'object' && 'name' in (rel as object))
    return (rel as { name: string | null }).name ?? null
  return null
}

/**
 * Pure predicate: returns true when a transaction matches the rule criteria.
 */
export function matchesRule(
  tx: { description?: string | null; type?: string | null; amount?: number | null },
  rule: MatchRule,
): boolean {
  // Type filter
  const ruleType = rule.transactionType
  if (ruleType && ruleType !== 'any' && ruleType !== tx.type) return false

  // Description pattern — supports /regex/flags or plain substring
  const raw = tx.description ?? ''
  const pattern = rule.descriptionPattern ?? ''
  const rxMatch = pattern.match(/^\/(.+)\/([gi]*)$/)
  if (rxMatch) {
    try {
      if (!new RegExp(rxMatch[1], rxMatch[2] || 'i').test(raw)) return false
    } catch {
      return false
    }
  } else {
    if (!raw.toLowerCase().includes(pattern.toLowerCase())) return false
  }

  // Amount bounds
  const amount = tx.amount ?? 0
  if (rule.amountMin != null && amount < rule.amountMin) return false
  if (rule.amountMax != null && amount > rule.amountMax) return false

  return true
}

/**
 * Find the highest-priority active rule that matches a transaction (or null).
 */
export async function findMatchingRule(
  payload: Payload,
  tx: { description?: string | null; type?: string | null; amount?: number | null },
): Promise<MatchRule | null> {
  const result = await payload.find({
    collection: 'match-rules',
    where: { isActive: { equals: true } },
    sort: '-priority',
    limit: 500,
    depth: 1,
  })
  for (const rule of result.docs) {
    if (matchesRule(tx, rule as unknown as MatchRule)) return rule as unknown as MatchRule
  }
  return null
}

/**
 * Build the Payload update payload for applying a rule to a transaction.
 * Returns an empty object if the rule has nothing to apply.
 */
function buildRuleUpdate(
  tx: Record<string, unknown>,
  rule: MatchRule,
): Record<string, unknown> {
  const rulePayeeId = resolveId(rule.payee)
  const payeeName = resolveName(rule.payee)
  const ruleExpenseCatId = resolveId(rule.expenseCategory)
  const ruleIncomeCatId = resolveId(rule.incomeCategory)
  const ruleRecurringItemId = resolveId(rule.recurringItem)

  const update: Record<string, unknown> = {}

  if (rulePayeeId) {
    update.payee = rulePayeeId
    if (payeeName) update.displayTitle = payeeName
  }
  if (ruleRecurringItemId) update.matchedRecurringItem = ruleRecurringItemId

  const type = tx.type as string
  if (type === 'expense' && (ruleExpenseCatId || rulePayeeId)) {
    update.expenseDetails = {
      ...((tx.expenseDetails as Record<string, unknown>) ?? {}),
      ...(ruleExpenseCatId ? { category: ruleExpenseCatId } : {}),
      ...(rulePayeeId ? { payee: rulePayeeId } : {}),
    }
  } else if (type === 'income' && (ruleIncomeCatId || rulePayeeId)) {
    update.incomeDetails = {
      ...((tx.incomeDetails as Record<string, unknown>) ?? {}),
      ...(ruleIncomeCatId ? { category: ruleIncomeCatId } : {}),
      ...(rulePayeeId ? { payee: rulePayeeId } : {}),
    }
  }

  return update
}

/**
 * Backfill ALL transactions that match a rule with the rule's values.
 * Called when a rule is created or updated from the drawer.
 */
export async function applyRuleToAllMatching(
  payload: Payload,
  rule: MatchRule,
): Promise<number> {
  const txResult = await payload.find({
    collection: 'transactions',
    limit: 2000,
    depth: 1,
  })

  let applied = 0
  for (const tx of txResult.docs) {
    if (!matchesRule(tx as unknown as { description: string; type: string; amount: number }, rule))
      continue

    const update = buildRuleUpdate(tx as unknown as Record<string, unknown>, rule)
    if (Object.keys(update).length === 0) continue

    await payload.update({
      collection: 'transactions',
      id: tx.id as string,
      data: update as never,
    })
    applied++
  }
  return applied
}

/**
 * Apply ALL active match-rules to synced transactions in a budget period.
 * Each transaction is checked against rules in priority order; first match wins.
 * Called on every budget period page load so new/updated rules propagate automatically.
 */
export async function applyMatchRules(
  payload: Payload,
  accountId: string,
  budgetStart?: string | null,
  budgetEnd?: string | null,
): Promise<{ applied: number }> {
  const rulesResult = await payload.find({
    collection: 'match-rules',
    where: { isActive: { equals: true } },
    sort: '-priority',
    limit: 500,
    depth: 1,
  })
  if (rulesResult.totalDocs === 0) return { applied: 0 }
  const rules = rulesResult.docs as unknown as MatchRule[]

  const conditions: Where[] = [
    { account: { equals: accountId } },
    { syncSource: { equals: 'teller' } },
  ]
  if (budgetStart) conditions.push({ date: { greater_than_equal: budgetStart } })
  if (budgetEnd) conditions.push({ date: { less_than_equal: budgetEnd } })

  const txResult = await payload.find({
    collection: 'transactions',
    where: { and: conditions },
    limit: 1000,
    depth: 1,
  })

  let applied = 0
  for (const tx of txResult.docs) {
    for (const rule of rules) {
      if (
        !matchesRule(tx as unknown as { description: string; type: string; amount: number }, rule)
      )
        continue

      const update = buildRuleUpdate(tx as unknown as Record<string, unknown>, rule)
      if (Object.keys(update).length > 0) {
        await payload.update({
          collection: 'transactions',
          id: tx.id as string,
          data: update as never,
        })
        applied++
      }
      break // first matching rule wins
    }
  }

  return { applied }
}
