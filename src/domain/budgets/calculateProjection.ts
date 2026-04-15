import { getSchedule } from '@/domain/schedules'
import { getFirstOccurrenceDate } from '@/domain/schedules/utils'
import { calculateStartingBalance } from '@/domain/budgets/calculateStartingBalance'
import type { BudgetItem, BudgetProjection, TransferItem } from '@/domain/budgets/types'
import type { Payload } from 'payload'

type NamedRelation = { id: string; name?: string } | string | null | undefined

function getRelationId(value: NamedRelation): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

function getRelationName(value: NamedRelation): string | null {
  if (!value || typeof value === 'string') return null
  return value.name || null
}

interface ProjectionArgs {
  startDate: string
  endDate: string
  accountId: string
  budgetId?: string | null
}

export async function calculateBudgetProjection(
  payload: Payload,
  { startDate, endDate, accountId, budgetId }: ProjectionArgs,
): Promise<BudgetProjection> {
  const periodStart = new Date(startDate)
  periodStart.setUTCHours(0, 0, 0, 0)

  const periodEnd = new Date(endDate)
  periodEnd.setUTCHours(23, 59, 59, 999)

  const account = await payload.findByID({
    collection: 'accounts',
    id: accountId,
  })

  const balanceAtPeriodStart = await calculateStartingBalance(
    payload,
    accountId,
    budgetId || null,
    periodStart,
  )

  const actualizedRecurringItemIds = new Set<string>()

  if (budgetId) {
    const budgetItems = await payload.find({
      collection: 'budget-items',
      where: {
        and: [{ budget: { equals: budgetId } }, { isActualized: { equals: true } }],
      },
      limit: 1000,
    })

    budgetItems.docs.forEach((budgetItem) => {
      const recurringItemId = getRelationId(budgetItem.recurringItem)
      if (recurringItemId) {
        actualizedRecurringItemIds.add(recurringItemId)
      }
    })
  }

  const recurringItems = await payload.find({
    collection: 'recurring-items',
    where: {
      and: [
        { isActive: { equals: true } },
        {
          or: [
            { account: { equals: accountId } },
            { fromAccount: { equals: accountId } },
            { toAccount: { equals: accountId } },
          ],
        },
      ],
    },
    depth: 1,
    limit: 1000,
  })

  const transactions = await payload.find({
    collection: 'transactions',
    where: {
      and: [
        { date: { greater_than_equal: periodStart.toISOString() } },
        { date: { less_than_equal: periodEnd.toISOString() } },
        {
          or: [
            { account: { equals: accountId } },
            { 'transferDetails.toAccount': { equals: accountId } },
          ],
        },
      ],
    },
    depth: 1,
    limit: 1000,
  })

  let income = 0
  let expenses = 0
  let incomeCount = 0
  let expenseCount = 0
  let transferInCount = 0
  let transferOutCount = 0

  const incomeItems: BudgetItem[] = []
  const expenseItems: BudgetItem[] = []
  const transferItems: TransferItem[] = []
  const plannedIncomeItems: BudgetItem[] = []
  const plannedExpenseItems: BudgetItem[] = []
  const plannedTransferItems: TransferItem[] = []

  transactions.docs.forEach((transaction) => {
    const transactionAccountId = getRelationId(transaction.account)

    if (transaction.type === 'income') {
      income += transaction.amount
      incomeCount++
      incomeItems.push({
        id: transaction.id,
        name: transaction.description || 'Income',
        amount: transaction.amount,
        categoryId: getRelationId(transaction.incomeDetails?.category),
        categoryName: getRelationName(transaction.incomeDetails?.category),
        payeeId: getRelationId(transaction.incomeDetails?.payee),
        payeeName: getRelationName(transaction.incomeDetails?.payee),
        dueDate: transaction.date,
        isActual: true,
      })
    } else if (transaction.type === 'expense') {
      expenses += transaction.amount
      expenseCount++
      expenseItems.push({
        id: transaction.id,
        name: transaction.description || 'Expense',
        amount: transaction.amount,
        categoryId: getRelationId(transaction.expenseDetails?.category),
        categoryName: getRelationName(transaction.expenseDetails?.category),
        payeeId: getRelationId(transaction.expenseDetails?.payee),
        payeeName: getRelationName(transaction.expenseDetails?.payee),
        dueDate: transaction.date,
        isActual: true,
      })
    } else if (transaction.type === 'transfer') {
      const toAccountId = getRelationId(transaction.transferDetails?.toAccount)

      if (transactionAccountId === accountId) {
        expenses += transaction.amount
        transferOutCount++
        transferItems.push({
          id: transaction.id,
          name: transaction.description || 'Transfer Out',
          amount: transaction.amount,
          direction: 'out',
          otherAccountId: toAccountId,
          otherAccountName: getRelationName(transaction.transferDetails?.toAccount),
          dueDate: transaction.date,
          isActual: true,
        })
      }

      if (toAccountId === accountId) {
        income += transaction.amount
        transferInCount++
        transferItems.push({
          id: transaction.id,
          name: transaction.description || 'Transfer In',
          amount: transaction.amount,
          direction: 'in',
          otherAccountId: transactionAccountId,
          otherAccountName: getRelationName(transaction.account),
          dueDate: transaction.date,
          isActual: true,
        })
      }
    }
  })

  recurringItems.docs.forEach((item) => {
    const schedule = getSchedule(item.scheduleType)
    if (!schedule) return

    const matchesPeriod = schedule.matchesPeriod(
      item as unknown as Record<string, unknown>,
      periodStart,
      periodEnd,
    )

    if (!matchesPeriod) return

    const firstOccurrence = getFirstOccurrenceDate(
      item.scheduleType,
      item as unknown as Record<string, unknown>,
      periodStart,
      periodEnd,
    )
    const dueDate = firstOccurrence ? firstOccurrence.toISOString() : null

    if (item.itemType === 'income') {
      const plannedItem: BudgetItem = {
        id: item.id,
        name: item.name,
        amount: item.amount,
        categoryId: getRelationId(item.incomeCategory),
        categoryName: getRelationName(item.incomeCategory),
        payeeId: getRelationId(item.payee),
        payeeName: getRelationName(item.payee),
        dueDate,
        isActual: false,
      }

      plannedIncomeItems.push(plannedItem)

      if (actualizedRecurringItemIds.has(item.id)) return

      income += item.amount
      incomeCount++
      incomeItems.push(plannedItem)
      return
    }

    if (item.itemType === 'expense') {
      const plannedItem: BudgetItem = {
        id: item.id,
        name: item.name,
        amount: item.amount,
        categoryId: getRelationId(item.expenseCategory),
        categoryName: getRelationName(item.expenseCategory),
        payeeId: getRelationId(item.payee),
        payeeName: getRelationName(item.payee),
        dueDate,
        isActual: false,
      }

      plannedExpenseItems.push(plannedItem)

      if (actualizedRecurringItemIds.has(item.id)) return

      expenses += item.amount
      expenseCount++
      expenseItems.push(plannedItem)
      return
    }

    const fromAccountId = getRelationId(item.fromAccount)
    const toAccountId = getRelationId(item.toAccount)

    if (fromAccountId === accountId) {
      const plannedTransfer: TransferItem = {
        id: item.id,
        name: item.name,
        amount: item.amount,
        direction: 'out',
        otherAccountId: toAccountId,
        otherAccountName: getRelationName(item.toAccount),
        dueDate,
        isActual: false,
      }

      plannedTransferItems.push(plannedTransfer)

      if (!actualizedRecurringItemIds.has(item.id)) {
        expenses += item.amount
        transferOutCount++
        transferItems.push(plannedTransfer)
      }
    }

    if (toAccountId === accountId) {
      const plannedTransfer: TransferItem = {
        id: item.id,
        name: item.name,
        amount: item.amount,
        direction: 'in',
        otherAccountId: fromAccountId,
        otherAccountName: getRelationName(item.fromAccount),
        dueDate,
        isActual: false,
      }

      plannedTransferItems.push(plannedTransfer)

      if (!actualizedRecurringItemIds.has(item.id)) {
        income += item.amount
        transferInCount++
        transferItems.push(plannedTransfer)
      }
    }
  })

  return {
    startingBalance: balanceAtPeriodStart,
    currentAccountBalance: account.currentBalance || 0,
    income,
    expenses,
    projectedBalance: balanceAtPeriodStart + income - expenses,
    incomeCount,
    expenseCount,
    transferInCount,
    transferOutCount,
    items: {
      income: incomeItems,
      expenses: expenseItems,
      transfers: transferItems,
    },
    plannedItems: {
      income: plannedIncomeItems,
      expenses: plannedExpenseItems,
      transfers: plannedTransferItems,
    },
  }
}
