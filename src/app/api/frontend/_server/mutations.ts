import { autoAdvanceBudgets } from '@/domain/budgets/autoAdvance'
import type { Transaction } from '@/payload-types'
import type { Payload } from 'payload'

type NamedCollection = 'income-categories' | 'expense-categories' | 'payees'

export interface CreateFrontendTransactionInput {
  accountId: string
  type: 'income' | 'expense' | 'transfer'
  date: string
  amount: number
  description: string
  notes?: string
  categoryId?: string | null
  categoryName?: string | null
  payeeId?: string | null
  payeeName?: string | null
  toAccountId?: string | null
}

export interface ActualizeBudgetItemInput {
  budgetId: string
  recurringItemId: string
  date: string
  amount?: number
  notes?: string
}

async function findOrCreateNamedEntity(
  payload: Payload,
  collection: NamedCollection,
  name: string,
) {
  const trimmedName = name.trim()
  if (!trimmedName) return null

  const existing = await payload.find({
    collection,
    sort: 'name',
    limit: 200,
  })

  const match = existing.docs.find((doc) => doc.name.toLowerCase() === trimmedName.toLowerCase())
  if (match) {
    return match.id
  }

  const created = await payload.create({
    collection,
    data: { name: trimmedName },
  })

  return created.id
}

async function resolveCategoryId(payload: Payload, input: CreateFrontendTransactionInput) {
  if (input.type === 'transfer') return null
  if (input.categoryId) return input.categoryId
  if (!input.categoryName) return null

  return findOrCreateNamedEntity(
    payload,
    input.type === 'income' ? 'income-categories' : 'expense-categories',
    input.categoryName,
  )
}

async function resolvePayeeId(payload: Payload, input: CreateFrontendTransactionInput) {
  if (input.type === 'transfer') return null
  if (input.payeeId) return input.payeeId
  if (!input.payeeName) return null

  return findOrCreateNamedEntity(payload, 'payees', input.payeeName)
}

export async function createFrontendTransaction(
  payload: Payload,
  input: CreateFrontendTransactionInput,
) {
  const transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> = {
    account: input.accountId,
    type: input.type,
    date: new Date(input.date).toISOString(),
    amount: input.amount,
    description: input.description,
    notes: input.notes || '',
  }

  const categoryId = await resolveCategoryId(payload, input)
  const payeeId = await resolvePayeeId(payload, input)

  if (input.type === 'income') {
    transactionData.incomeDetails = { category: categoryId, payee: payeeId }
  }

  if (input.type === 'expense') {
    transactionData.expenseDetails = { category: categoryId, payee: payeeId }
  }

  if (input.type === 'transfer') {
    if (!input.toAccountId || input.toAccountId === input.accountId) {
      throw new Error('Transfers require a different destination account.')
    }

    transactionData.transferDetails = { toAccount: input.toAccountId }
  }

  return payload.create({
    collection: 'transactions',
    data: transactionData,
  })
}

export async function actualizeBudgetItem(payload: Payload, input: ActualizeBudgetItemInput) {
  const existing = await payload.find({
    collection: 'budget-items',
    where: {
      and: [
        { budget: { equals: input.budgetId } },
        { recurringItem: { equals: input.recurringItemId } },
        { isActualized: { equals: true } },
      ],
    },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    throw new Error('This recurring item is already actualized for the selected budget.')
  }

  const recurringItem = await payload.findByID({
    collection: 'recurring-items',
    id: input.recurringItemId,
    depth: 1,
  })

  const sourceAccountId =
    recurringItem.itemType === 'transfer'
      ? typeof recurringItem.fromAccount === 'string'
        ? recurringItem.fromAccount
        : recurringItem.fromAccount?.id
      : typeof recurringItem.account === 'string'
        ? recurringItem.account
        : recurringItem.account?.id

  if (!sourceAccountId) {
    throw new Error('Recurring item is missing its source account.')
  }

  const transaction = await createFrontendTransaction(payload, {
    accountId: sourceAccountId,
    type: recurringItem.itemType,
    date: input.date,
    amount: input.amount ?? recurringItem.amount,
    description: recurringItem.name,
    notes: input.notes || '',
    categoryId:
      recurringItem.itemType === 'income'
        ? typeof recurringItem.incomeCategory === 'string'
          ? recurringItem.incomeCategory
          : recurringItem.incomeCategory?.id
        : recurringItem.itemType === 'expense'
          ? typeof recurringItem.expenseCategory === 'string'
            ? recurringItem.expenseCategory
            : recurringItem.expenseCategory?.id
          : null,
    payeeId:
      recurringItem.itemType === 'transfer'
        ? null
        : typeof recurringItem.payee === 'string'
          ? recurringItem.payee
          : recurringItem.payee?.id,
    toAccountId:
      recurringItem.itemType === 'transfer'
        ? typeof recurringItem.toAccount === 'string'
          ? recurringItem.toAccount
          : recurringItem.toAccount?.id
        : null,
  })

  const budgetItem = await payload.create({
    collection: 'budget-items',
    data: {
      budget: input.budgetId,
      recurringItem: input.recurringItemId,
      dueDate: new Date(input.date).toISOString(),
      isActualized: true,
      transaction: transaction.id,
      notes: input.notes || '',
    },
  })

  return { transaction, budgetItem }
}

export async function refreshBudgetState(payload: Payload, accountId: string) {
  return autoAdvanceBudgets(payload, accountId)
}
