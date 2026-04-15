import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'

/**
 * TellerInsights stores the results of Ollama analysis for bank transaction descriptions.
 *
 * One record per unique (normalizedDescription, transactionType) pair.
 * When a synced transaction matches a known description, its insight is reused
 * instead of calling Ollama again.
 *
 * Workflow:
 *   1. Sync runs → matchEngine checks this collection before calling Ollama
 *   2. No cached insight → Ollama is called → new document created with status=pending
 *   3. Admin reviews pending insights → accepts (or edits) payee / category / recurring item
 *   4. AfterChange hook fires on status=accepted:
 *      a. Creates a MatchRule for future syncs
 *      b. Backfills payee + displayTitle on all existing transactions with the same description
 */

function resolveId(rel: unknown): string | null {
  if (!rel) return null
  if (typeof rel === 'string') return rel
  if (typeof rel === 'object' && rel !== null && 'id' in rel) return (rel as { id: string }).id
  return null
}

function resolveName(rel: unknown): string | null {
  if (!rel) return null
  if (typeof rel === 'object' && rel !== null && 'name' in rel)
    return (rel as { name: string }).name
  return null
}

/**
 * Fired whenever a TellerInsight is saved.
 * When status transitions to 'accepted':
 *   1. Creates a MatchRule so future syncs take the fast rule path
 *   2. Backfills payee + displayTitle on all existing transactions that share
 *      the same raw description
 */
const applyOnAccept: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  if (doc.status !== 'accepted') return
  if (previousDoc?.status === 'accepted') return

  const { payload } = req

  const payeeId = resolveId(doc.acceptedPayee) ?? resolveId(doc.suggestedPayeeLink)
  const payeeName =
    resolveName(doc.acceptedPayee) ??
    resolveName(doc.suggestedPayeeLink) ??
    (doc.suggestedPayee as string | null)
  const expenseCategoryId =
    resolveId(doc.acceptedExpenseCategory) ?? resolveId(doc.suggestedExpenseCategory)
  const incomeCategoryId =
    resolveId(doc.acceptedIncomeCategory) ?? resolveId(doc.suggestedIncomeCategory)
  const recurringItemId = resolveId(doc.acceptedRecurringItem)
  const ruleName = payeeName || (doc.exampleDescription as string)

  // ── 1. Create MatchRule if one doesn't exist yet ────────────────────────
  const existingRule = await payload.find({
    collection: 'match-rules',
    where: { descriptionPattern: { equals: doc.exampleDescription } },
    limit: 1,
  })

  if (existingRule.totalDocs === 0) {
    const ruleData: Record<string, unknown> = {
      name: ruleName,
      descriptionPattern: doc.exampleDescription,
      transactionType:
        doc.transactionType === 'transfer' ? 'transfer' : (doc.transactionType as string),
      isActive: true,
      priority: 0,
    }
    if (payeeId) ruleData.payee = payeeId
    if (expenseCategoryId) ruleData.expenseCategory = expenseCategoryId
    if (incomeCategoryId) ruleData.incomeCategory = incomeCategoryId
    if (recurringItemId) ruleData.recurringItem = recurringItemId

    await payload.create({ collection: 'match-rules', data: ruleData as never })
  }

  // ── 2. Backfill existing transactions with this description ─────────────
  if (!payeeId && !expenseCategoryId && !incomeCategoryId) return

  const txResult = await payload.find({
    collection: 'transactions',
    where: { description: { equals: doc.exampleDescription as string } },
    limit: 500,
  })

  for (const tx of txResult.docs) {
    const update: Record<string, unknown> = {}
    if (payeeId) update.payee = payeeId
    if (payeeName) update.displayTitle = payeeName
    // Only set category if not already manually set
    if (expenseCategoryId && tx.type === 'expense' && !tx.expenseDetails?.category) {
      update.expenseDetails = {
        ...((tx.expenseDetails as Record<string, unknown>) ?? {}),
        category: expenseCategoryId,
      }
    }
    if (incomeCategoryId && tx.type === 'income' && !tx.incomeDetails?.category) {
      update.incomeDetails = {
        ...((tx.incomeDetails as Record<string, unknown>) ?? {}),
        category: incomeCategoryId,
      }
    }
    if (Object.keys(update).length > 0) {
      await payload.update({
        collection: 'transactions',
        id: tx.id as string,
        data: update as never,
      })
    }
  }
}

export const TellerInsights: CollectionConfig = {
  slug: 'teller-insights',
  admin: {
    useAsTitle: 'exampleDescription',
    description: 'AI-generated categorization suggestions for synced transactions, pending review',
    group: '⚙️ System',
    defaultColumns: [
      'exampleDescription',
      'transactionType',
      'exampleAmount',
      'suggestedPayee',
      'status',
    ],
    listSearchableFields: ['exampleDescription', 'suggestedPayee'],
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [applyOnAccept],
  },
  fields: [
    // ── Key ────────────────────────────────────────────────────────────────
    {
      name: 'descriptionKey',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        readOnly: true,
        description: 'Normalized description key used for deduplication (auto-generated)',
        position: 'sidebar',
      },
    },
    {
      name: 'exampleDescription',
      type: 'text',
      required: true,
      admin: {
        description: 'Exact description text from the bank (for display and rule creation)',
      },
    },
    {
      name: 'transactionType',
      type: 'select',
      required: true,
      options: [
        { label: 'Expense', value: 'expense' },
        { label: 'Income', value: 'income' },
        { label: 'Transfer', value: 'transfer' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'exampleAmount',
      type: 'number',
      min: 0,
      admin: {
        description: 'Amount from the transaction that triggered this analysis',
        position: 'sidebar',
      },
    },

    // ── Ollama suggestions ─────────────────────────────────────────────────
    {
      name: 'suggestedPayee',
      type: 'text',
      admin: {
        description: "Ollama's cleaned merchant / payee name (raw string)",
      },
    },
    {
      name: 'suggestedPayeeLink',
      type: 'relationship',
      relationTo: 'payees',
      admin: {
        description:
          "Matched Payee record for Ollama's suggestion (auto-resolved; null if no payee record matched)",
      },
    },
    {
      name: 'suggestedExpenseCategory',
      type: 'relationship',
      relationTo: 'expense-categories',
      admin: {
        description: "Ollama's suggested expense category",
        condition: (data) => data?.transactionType === 'expense' || !data?.transactionType,
      },
    },
    {
      name: 'suggestedIncomeCategory',
      type: 'relationship',
      relationTo: 'income-categories',
      admin: {
        description: "Ollama's suggested income category",
        condition: (data) => data?.transactionType === 'income',
      },
    },
    {
      name: 'suggestedRecurringItems',
      type: 'relationship',
      relationTo: 'recurring-items',
      hasMany: true,
      admin: {
        description: 'Recurring items identified as possible matches based on amount and timing',
      },
    },
    {
      name: 'ollamaConfidence',
      type: 'select',
      options: [
        { label: 'High', value: 'high' },
        { label: 'Medium', value: 'medium' },
        { label: 'Low', value: 'low' },
      ],
      admin: {
        description: "Ollama's stated confidence level",
        position: 'sidebar',
      },
    },

    // ── Review / acceptance ────────────────────────────────────────────────
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending Review', value: 'pending' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Rejected', value: 'rejected' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Set to Accepted to confirm values and auto-create a MatchRule for future syncs',
      },
    },
    {
      name: 'acceptedPayee',
      type: 'relationship',
      relationTo: 'payees',
      admin: {
        description:
          'Payee to assign (defaults to suggestedPayeeLink; create a new Payee record first if needed)',
      },
    },
    {
      name: 'acceptedExpenseCategory',
      type: 'relationship',
      relationTo: 'expense-categories',
      admin: {
        description:
          'The expense category to use (defaults to suggested; override before accepting)',
        condition: (data) => data?.transactionType === 'expense' || !data?.transactionType,
      },
    },
    {
      name: 'acceptedIncomeCategory',
      type: 'relationship',
      relationTo: 'income-categories',
      admin: {
        description:
          'The income category to use (defaults to suggested; override before accepting)',
        condition: (data) => data?.transactionType === 'income',
      },
    },
    {
      name: 'acceptedRecurringItem',
      type: 'relationship',
      relationTo: 'recurring-items',
      admin: {
        description:
          'The recurring item to link (pick from suggestedRecurringItems or choose manually)',
      },
    },

    // ── Debug ──────────────────────────────────────────────────────────────
    {
      name: 'ollamaRaw',
      type: 'json',
      admin: {
        readOnly: true,
        description: 'Raw Ollama response (for debugging)',
        condition: () => false, // hidden from admin UI
      },
    },
  ],
}
