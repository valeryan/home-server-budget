/**
 * POST /api/frontend/transaction-insight
 *
 * Fetch or create a TellerInsight for a specific transaction.
 * Called when the user opens the insight drawer on the spending page.
 *
 * Body: { transactionId: string; skipAI?: boolean; forceRefresh?: boolean }
 *
 * - Initial drawer open:   skipAI=true  → show what is stored, never call Ollama
 * - "Analyze with AI":     skipAI=false → call Ollama if no cache exists
 * - "Re-analyze" button:   forceRefresh=true → always call Ollama, overwrite cached suggestions
 *
 * Returns the insight document (pending/accepted/rejected) plus the full
 * transaction record so the drawer can pre-populate its form fields.
 */

import { applyRuleToAllMatching, findMatchingRule } from '@/domain/matching/applyRules'
import type { MatchRule } from '@/domain/matching/applyRules'
import { getOrCreateInsight } from '@/integrations/ollama/insight'
import { getPayloadClient } from '@/payload/client'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayloadClient()

    const body = (await req.json()) as {
      transactionId?: string
      skipAI?: boolean
      forceRefresh?: boolean
    }
    const { transactionId, skipAI = false, forceRefresh = false } = body

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId is required' }, { status: 400 })
    }

    // Load the transaction with full depth
    const tx = await payload.findByID({
      collection: 'transactions',
      id: transactionId,
      depth: 2,
    })

    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Only expense/income can have insights (transfers are internal)
    const type = tx.type as 'income' | 'expense' | 'transfer'
    if (type === 'transfer') {
      return NextResponse.json({ transaction: tx, insight: null })
    }

    const insight = await getOrCreateInsight(
      payload,
      // Provide a minimal RawTellerTransaction shape — date is all we need here
      {
        id: '',
        account_id: '',
        date: (tx.date as string).slice(0, 10),
        description: '',
        amount: String(tx.amount),
        type: 'other',
        status: 'posted',
        details: {},
      },
      tx.description as string, // always use raw description as key
      type,
      tx.amount as number,
      skipAI,
      forceRefresh,
    )

    // Load full insight document if one exists, with populated relationships
    let insightDoc: Record<string, unknown> | null = null
    if (insight) {
      const found = await payload.findByID({
        collection: 'teller-insights',
        id: insight.insightId,
        depth: 2,
      })
      insightDoc = found as unknown as Record<string, unknown>
    }

    // Find which rule (if any) currently applies to this transaction
    const matchedRule = await findMatchingRule(payload, {
      description: tx.description as string,
      type: tx.type as string,
      amount: tx.amount as number,
    })

    return NextResponse.json({ transaction: tx, insight: insightDoc, matchedRule: matchedRule ?? null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load insight'
    console.error('[transaction-insight]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PATCH /api/frontend/transaction-insight
 *
 * Save review decisions for an insight + optionally apply to the transaction.
 *
 * Body:
 *   insightId           — the teller-insights doc id (optional, only needed for AI accept path)
 *   transactionId       — the transaction to update immediately
 *   displayTitle        — human readable name to save on this transaction
 *   payeeId             — Payees collection ID (or null)
 *   payeeName           — if set and payeeId is null, creates a new Payee
 *   expenseCategoryId
 *   incomeCategoryId
 *   recurringItemId
 *   createRule          — if true, upserts a match-rule from current values + backfills all matching transactions
 *   accept              — sets insight status to `accepted` when an insight is being confirmed
 */
export async function PATCH(req: NextRequest) {
  try {
    const payload = await getPayloadClient()

    const body = (await req.json()) as {
      insightId?: string
      transactionId: string
      displayTitle?: string
      payeeId?: string | null
      payeeName?: string | null
      expenseCategoryId?: string | null
      incomeCategoryId?: string | null
      recurringItemId?: string | null
      createRule?: boolean
      accept?: boolean
    }

    const { transactionId, insightId, displayTitle, payeeName, createRule = false, accept = false } = body
    let { payeeId } = body
    const { expenseCategoryId, incomeCategoryId, recurringItemId } = body

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId is required' }, { status: 400 })
    }

    // Create payee if a name was given but no ID
    if (!payeeId && payeeName) {
      const existing = await payload.find({
        collection: 'payees',
        where: { name: { equals: payeeName } },
        limit: 1,
      })
      if (existing.totalDocs > 0) {
        payeeId = existing.docs[0].id as string
      } else {
        const created = await payload.create({
          collection: 'payees',
          data: { name: payeeName } as never,
        })
        payeeId = created.id as string
      }
    }

    // Update the transaction
    const txUpdate: Record<string, unknown> = {}
    if (displayTitle !== undefined) txUpdate.displayTitle = displayTitle || null
    if (payeeId !== undefined) txUpdate.payee = payeeId || null

    const tx = await payload.findByID({ collection: 'transactions', id: transactionId, depth: 0 })
    if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

    if (tx.type === 'expense') {
      if (expenseCategoryId !== undefined) {
        txUpdate.expenseDetails = {
          ...((tx.expenseDetails as Record<string, unknown>) ?? {}),
          category: expenseCategoryId || null,
          ...(payeeId ? { payee: payeeId } : {}),
        }
      } else if (payeeId) {
        txUpdate.expenseDetails = {
          ...((tx.expenseDetails as Record<string, unknown>) ?? {}),
          payee: payeeId,
        }
      }
    } else if (tx.type === 'income') {
      if (incomeCategoryId !== undefined) {
        txUpdate.incomeDetails = {
          ...((tx.incomeDetails as Record<string, unknown>) ?? {}),
          category: incomeCategoryId || null,
          ...(payeeId ? { payee: payeeId } : {}),
        }
      } else if (payeeId) {
        txUpdate.incomeDetails = {
          ...((tx.incomeDetails as Record<string, unknown>) ?? {}),
          payee: payeeId,
        }
      }
    }

    if (recurringItemId !== undefined) txUpdate.matchedRecurringItem = recurringItemId || null

    if (Object.keys(txUpdate).length > 0) {
      await payload.update({
        collection: 'transactions',
        id: transactionId,
        data: txUpdate as never,
      })
    }

    // Update insight if provided (admin AI path)
    if (insightId) {
      const insightUpdate: Record<string, unknown> = {}
      if (payeeId) insightUpdate.acceptedPayee = payeeId
      if (expenseCategoryId) insightUpdate.acceptedExpenseCategory = expenseCategoryId
      if (incomeCategoryId) insightUpdate.acceptedIncomeCategory = incomeCategoryId
      if (recurringItemId) insightUpdate.acceptedRecurringItem = recurringItemId
      if (accept) insightUpdate.status = 'accepted'

      if (Object.keys(insightUpdate).length > 0) {
        await payload.update({
          collection: 'teller-insights',
          id: insightId,
          data: insightUpdate as never,
        })
      }
    }

    // Create or update a match-rule from the current form values, then backfill
    if (createRule) {
      const fullTx = await payload.findByID({ collection: 'transactions', id: transactionId, depth: 0 })
      if (fullTx) {
        const txDescription = fullTx.description as string
        const txType = fullTx.type as string
        const ruleName =
          (payeeName ?? (payeeId
            ? (await payload.findByID({ collection: 'payees', id: payeeId, depth: 0 }))?.name
            : null)) ??
          txDescription

        const ruleData: Record<string, unknown> = {
          name: ruleName,
          descriptionPattern: txDescription,
          transactionType: txType,
          isActive: true,
          priority: 0,
        }
        if (payeeId) ruleData.payee = payeeId
        if (expenseCategoryId) ruleData.expenseCategory = expenseCategoryId
        if (incomeCategoryId) ruleData.incomeCategory = incomeCategoryId
        if (recurringItemId) ruleData.recurringItem = recurringItemId

        const existingRules = await payload.find({
          collection: 'match-rules',
          where: { descriptionPattern: { equals: txDescription } },
          limit: 1,
        })

        let savedRule
        if (existingRules.totalDocs > 0) {
          savedRule = await payload.update({
            collection: 'match-rules',
            id: existingRules.docs[0].id as string,
            data: ruleData as never,
            depth: 1,
          })
        } else {
          savedRule = await payload.create({
            collection: 'match-rules',
            data: ruleData as never,
            depth: 1,
          })
        }

        // Backfill all matching transactions with the new rule values
        await applyRuleToAllMatching(payload, savedRule as unknown as MatchRule)
      }
    }

    return NextResponse.json({ ok: true, payeeId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save insight'
    console.error('[transaction-insight PATCH]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
