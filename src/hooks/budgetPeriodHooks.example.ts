/**
 * Example Hook: Auto-populate Budget Period from Recurring Items
 *
 * This hook automatically populates a new budget period with the appropriate
 * recurring items based on their schedule and the budget period dates.
 *
 * To use this:
 * 1. Uncomment the code below
 * 2. Import this in BudgetPeriods.ts
 * 3. Add it to the hooks configuration
 */

import type { CollectionBeforeChangeHook } from 'payload'
import { getSchedule } from '../lib/schedules'

export const populateFromRecurringItems: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
}) => {
  // Only run on create, and only if income/expenses/transfers are empty
  if (operation !== 'create') return data

  const hasItems =
    (data.income && data.income.length > 0) ||
    (data.expenses && data.expenses.length > 0) ||
    (data.transfers && data.transfers.length > 0)

  // If user already added items, don't override
  if (hasItems) return data

  // Validate we have the required dates
  if (!data.startDate || !data.endDate) {
    req.payload.logger.warn('Budget period is missing start or end date, skipping auto-population')
    return data
  }

  const periodStart = new Date(data.startDate)
  const periodEnd = new Date(data.endDate)

  try {
    // Fetch all active recurring items
    const recurringItems = await req.payload.find({
      collection: 'recurring-items',
      where: {
        isActive: {
          equals: true,
        },
      },
      limit: 1000,
    })

    // Separate items by type and filter by schedule
    const incomeItems = recurringItems.docs.filter((item) => {
      if (item.itemType !== 'income') return false
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scheduleType = (item as any).scheduleType
      const schedule = getSchedule(scheduleType as string)
      if (!schedule) return false
      return schedule.matchesPeriod(
        item as unknown as Record<string, unknown>,
        periodStart,
        periodEnd,
      )
    })

    const expenseItems = recurringItems.docs.filter((item) => {
      if (item.itemType !== 'expense') return false
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scheduleType = (item as any).scheduleType
      const schedule = getSchedule(scheduleType as string)
      if (!schedule) return false
      return schedule.matchesPeriod(
        item as unknown as Record<string, unknown>,
        periodStart,
        periodEnd,
      )
    })

    const transferItems = recurringItems.docs.filter((item) => {
      if (item.itemType !== 'transfer') return false
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scheduleType = (item as any).scheduleType
      const schedule = getSchedule(scheduleType as string)
      if (!schedule) return false
      return schedule.matchesPeriod(
        item as unknown as Record<string, unknown>,
        periodStart,
        periodEnd,
      )
    })

    // Populate income items
    data.income = incomeItems.map((item) => ({
      recurringItem: item.id,
      name: item.name,
      amount: item.amount,
      actualAmount: null,
      category: item.incomeCategory,
      payee: item.payee,
      account: item.account,
      date: null,
      received: false,
      notes: item.notes || '',
    }))

    // Populate expense items
    data.expenses = expenseItems.map((item) => ({
      recurringItem: item.id,
      name: item.name,
      amount: item.amount,
      actualAmount: null,
      category: item.expenseCategory,
      payee: item.payee,
      account: item.account,
      dueDate: null,
      paid: false,
      notes: item.notes || '',
    }))

    // Populate transfer items
    data.transfers = transferItems.map((item) => ({
      recurringItem: item.id,
      name: item.name,
      amount: item.amount,
      fromAccount: item.fromAccount,
      toAccount: item.toAccount,
      date: null,
      completed: false,
      notes: item.notes || '',
    }))

    req.payload.logger.info(
      `Auto-populated budget period (${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}) ` +
        `with ${data.income.length} income, ${data.expenses.length} expenses, and ${data.transfers.length} transfers`,
    )
  } catch (error) {
    req.payload.logger.error({
      msg: 'Error populating budget period from recurring items',
      err: error,
    })
    // Don't fail the creation, just log the error
  }

  return data
}

/**
 * Example Hook: Calculate Summary Totals
 *
 * This calculates the total income, expenses, and net income
 * for a budget period.
 */

export const calculateSummary: CollectionBeforeChangeHook = async ({ data }) => {
  // Calculate total income
  const totalIncome = (data.income || []).reduce((sum: number, item: Record<string, unknown>) => {
    const actualAmount = typeof item.actualAmount === 'number' ? item.actualAmount : 0
    const amount = typeof item.amount === 'number' ? item.amount : 0
    return sum + (actualAmount || amount)
  }, 0)

  // Calculate total expenses
  const totalExpenses = (data.expenses || []).reduce(
    (sum: number, item: Record<string, unknown>) => {
      const actualAmount = typeof item.actualAmount === 'number' ? item.actualAmount : 0
      const amount = typeof item.amount === 'number' ? item.amount : 0
      return sum + (actualAmount || amount)
    },
    0,
  )

  // Calculate net income
  const netIncome = totalIncome - totalExpenses

  // Update summary
  data.summary = {
    totalIncome,
    totalExpenses,
    netIncome,
  }

  return data
}

/**
 * To use these hooks, add them to BudgetPeriods.ts:
 *
 * import { populateFromRecurringItems, calculateSummary } from './hooks/budgetPeriodHooks.example'
 *
 * export const Budgets: CollectionConfig = {
 *   // ... other config
 *   hooks: {
 *     beforeChange: [populateFromRecurringItems, calculateSummary],
 *   },
 * }
 */
