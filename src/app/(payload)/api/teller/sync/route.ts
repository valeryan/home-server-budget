/**
 * POST /api/teller/sync
 *
 * Pulls new transactions from Teller for a given account using date-windowed
 * fetching so we never download the full account history.
 *
 * First sync:
 *   - Pulls last INITIAL_LOOKBACK_DAYS days via start_date
 *   - Fetches the live Teller balance and back-calculates the account
 *     startingBalance so currentBalance ends up matching Teller's ledger
 *   - Skips Ollama AI categorization (bulk import — too slow)
 *
 * Subsequent syncs:
 *   - Uses start_date = tellerLastSyncedAt - OVERLAP_DAYS to catch
 *     pending→posted transitions (Teller recommendation: 7-10 day overlap)
 *   - Runs Ollama AI on unmatched transactions (small incremental batch)
 *
 * Body: { accountId: string }
 * Auth: requires a logged-in Payload session
 */

import type { RawTellerTransaction } from '@/domain/matching/engine'
import { matchTransaction } from '@/domain/matching/engine'
import { fetchTellerBalances, tellerGet } from '@/integrations/teller/client'
import { getPayloadClient } from '@/payload/client'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const TELLER_API = 'https://api.teller.io'

/** Days to look back on the very first sync */
const INITIAL_LOOKBACK_DAYS = 90

/** Extra days of overlap on incremental syncs to catch pending→posted transitions */
const OVERLAP_DAYS = 7

/** Skip AI categorization if there are more than this many new transactions (bulk import) */
const AI_BATCH_LIMIT = 20

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function fetchTellerTransactions(
  accessToken: string,
  tellerAccountId: string,
  startDate: string,
): Promise<RawTellerTransaction[]> {
  const url = new URL(`${TELLER_API}/accounts/${tellerAccountId}/transactions`)
  url.searchParams.set('start_date', startDate)
  return tellerGet<RawTellerTransaction[]>(url.toString(), accessToken)
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayloadClient()

    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as { accountId?: string }
    const { accountId } = body

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const account = await payload.findByID({ collection: 'accounts', id: accountId })
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const accessToken = account.tellerAccessToken as string | null | undefined
    const tellerAccountId = account.tellerAccountId as string | null | undefined

    if (!accessToken || !tellerAccountId) {
      return NextResponse.json(
        { error: 'Account is not connected to Teller. Use /api/teller/connect first.' },
        { status: 422 },
      )
    }

    const lastSyncedAt = account.tellerLastSyncedAt as string | null | undefined
    const isFirstSync = !lastSyncedAt

    // ── Determine the start_date window ────────────────────────────────────
    let startDate: string
    if (isFirstSync) {
      const d = new Date()
      d.setDate(d.getDate() - INITIAL_LOOKBACK_DAYS)
      startDate = isoDate(d)
    } else {
      // Overlap by OVERLAP_DAYS to catch pending→posted date shifts
      const d = new Date(lastSyncedAt)
      d.setDate(d.getDate() - OVERLAP_DAYS)
      startDate = isoDate(d)
    }

    // ── Fetch from Teller ───────────────────────────────────────────────────
    const rawTransactions = await fetchTellerTransactions(accessToken, tellerAccountId, startDate)
    const posted = rawTransactions.filter((t) => t.status === 'posted')

    // On first sync, also grab the live balance to set startingBalance
    let tellerLedger: number | null = null
    if (isFirstSync) {
      try {
        const balances = await fetchTellerBalances(accessToken, tellerAccountId)
        tellerLedger = balances.ledger ? parseFloat(balances.ledger) : null
      } catch {
        // Non-fatal — we'll skip startingBalance adjustment if unavailable
      }
    }

    // On bulk first import, skip Ollama AI (too many sequential calls = very slow)
    const skipAI = isFirstSync && posted.length > AI_BATCH_LIMIT

    let created = 0
    let skipped = 0
    let matched = 0
    let netImpact = 0 // tracks sum of all created transactions' balance impact

    for (const raw of posted) {
      // Deduplicate by Teller ID
      const existing = await payload.find({
        collection: 'transactions',
        where: { tellerTransactionId: { equals: raw.id } },
        limit: 1,
      })

      if (existing.totalDocs > 0) {
        skipped++
        continue
      }

      const result = await matchTransaction(payload, raw, skipAI)

      const txDoc: Record<string, unknown> = {
        date: new Date(result.date).toISOString(),
        account: accountId,
        type: result.transactionType,
        description: result.description,
        amount: result.amount,
        tellerTransactionId: result.tellerTransactionId,
        syncSource: 'teller',
        matchConfidence: result.matchConfidence,
        reconciled: false,
      }

      if (result.recurringItemId) txDoc.matchedRecurringItem = result.recurringItemId
      if (result.payeeId) txDoc.payee = result.payeeId
      if (result.displayTitle) txDoc.displayTitle = result.displayTitle
      if (result.transactionType === 'expense' && result.expenseCategoryId) {
        txDoc.expenseDetails = {
          category: result.expenseCategoryId,
          ...(result.payeeId ? { payee: result.payeeId } : {}),
        }
      } else if (result.transactionType === 'income' && result.incomeCategoryId) {
        txDoc.incomeDetails = {
          category: result.incomeCategoryId,
          ...(result.payeeId ? { payee: result.payeeId } : {}),
        }
      }

      const newTx = await payload.create({ collection: 'transactions', data: txDoc as never })
      created++

      // Track net balance impact for the starting balance calculation during the initial sync
      // income/transfer-in: +amount  |  expense/transfer-out: -amount
      if (result.transactionType === 'income') netImpact += result.amount
      else if (result.transactionType === 'expense') netImpact -= result.amount
      // Transfer balance adjustments are skipped here because they depend on both sides of the transfer.

      if (result.recurringItemId) {
        matched++
        await claimBudgetItem(payload, accountId, result.recurringItemId, newTx.id, result.date)
      }
    }

    // ── First sync: set startingBalance so currentBalance matches Teller ───
    if (isFirstSync && tellerLedger !== null && created > 0) {
      // startingBalance = ledger - netImpact
      // After updateAccountBalance runs: currentBalance = startingBalance + netImpact = ledger ✓
      const newStartingBalance = tellerLedger - netImpact
      await payload.update({
        collection: 'accounts',
        id: accountId,
        data: { startingBalance: newStartingBalance } as never,
      })
    }

    await payload.update({
      collection: 'accounts',
      id: accountId,
      data: { tellerLastSyncedAt: new Date().toISOString() } as never,
    })

    return NextResponse.json({
      ok: true,
      window: { startDate, isFirstSync },
      pulled: posted.length,
      created,
      skipped,
      matched,
      ...(isFirstSync && tellerLedger !== null
        ? { startingBalance: tellerLedger - netImpact }
        : {}),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    console.error('[teller/sync]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function claimBudgetItem(
  payload: Parameters<typeof matchTransaction>[0],
  accountId: string,
  recurringItemId: string,
  transactionId: string,
  transactionDate: string,
) {
  const txDate = new Date(transactionDate)

  const budgets = await payload.find({
    collection: 'budgets',
    where: {
      and: [
        { account: { equals: accountId } },
        { startDate: { less_than_equal: txDate.toISOString() } },
        { endDate: { greater_than_equal: txDate.toISOString() } },
      ],
    },
    limit: 1,
  })

  if (budgets.totalDocs === 0) return

  const budget = budgets.docs[0]

  const budgetItems = await payload.find({
    collection: 'budget-items',
    where: {
      and: [
        { budget: { equals: budget.id } },
        { recurringItem: { equals: recurringItemId } },
        { isActualized: { not_equals: true } },
      ],
    },
    limit: 1,
  })

  if (budgetItems.totalDocs === 0) return

  await payload.update({
    collection: 'budget-items',
    id: budgetItems.docs[0].id,
    data: { isActualized: true, transaction: transactionId } as never,
  })
}
