import { calculateStartingBalance } from '@/lib/budgetCalculations'
import { getSchedule } from '@/lib/schedules'
import { getFirstOccurrenceDate } from '@/lib/schedules/utils'
import config from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const accountId = searchParams.get('account')
  const budgetId = searchParams.get('budgetId')

  if (!startDate || !endDate || !accountId) {
    return NextResponse.json(
      { error: 'Missing required parameters: startDate, endDate, account' },
      { status: 400 },
    )
  }

  try {
    const payload = await getPayload({ config })

    const periodStart = new Date(startDate)
    periodStart.setUTCHours(0, 0, 0, 0)

    const periodEnd = new Date(endDate)
    periodEnd.setUTCHours(23, 59, 59, 999)

    // Fetch the account to get current balance
    const account = await payload.findByID({
      collection: 'accounts',
      id: accountId,
    })

    // Calculate the balance at the start of the budget period
    const balanceAtPeriodStart = await calculateStartingBalance(
      payload,
      accountId,
      budgetId,
      periodStart,
    )

    // Fetch actualized budget items if budgetId is provided
    const actualizedRecurringItemIds: Set<string> = new Set()
    if (budgetId) {
      const budgetItems = await payload.find({
        collection: 'budget-items',
        where: {
          and: [
            {
              budget: {
                equals: budgetId,
              },
            },
            {
              isActualized: {
                equals: true,
              },
            },
          ],
        },
        limit: 1000,
      })

      budgetItems.docs.forEach((bi) => {
        const recurringItemId =
          typeof bi.recurringItem === 'string' ? bi.recurringItem : bi.recurringItem?.id
        if (recurringItemId) {
          actualizedRecurringItemIds.add(recurringItemId)
        }
      })
    }

    // Fetch all active recurring items for this account
    const recurringItems = await payload.find({
      collection: 'recurring-items',
      where: {
        and: [
          {
            isActive: {
              equals: true,
            },
          },
          {
            or: [
              {
                account: {
                  equals: accountId,
                },
              },
              {
                fromAccount: {
                  equals: accountId,
                },
              },
              {
                toAccount: {
                  equals: accountId,
                },
              },
            ],
          },
        ],
      },
      limit: 1000,
    })

    // Fetch all transactions in the budget period for this account
    const transactions = await payload.find({
      collection: 'transactions',
      where: {
        and: [
          {
            date: {
              greater_than_equal: periodStart.toISOString(),
            },
          },
          {
            date: {
              less_than_equal: periodEnd.toISOString(),
            },
          },
          {
            or: [
              {
                account: {
                  equals: accountId,
                },
              },
              {
                'transferDetails.toAccount': {
                  equals: accountId,
                },
              },
            ],
          },
        ],
      },
      limit: 1000,
    })

    let income = 0
    let expenses = 0
    let incomeCount = 0
    let expenseCount = 0
    let transferInCount = 0
    let transferOutCount = 0

    // Track detailed items for display
    const incomeItems: Array<{
      id: string
      name: string
      amount: number
      categoryId: string | null
      categoryName: string | null
      payeeId: string | null
      payeeName: string | null
      isActual?: boolean
    }> = []
    const expenseItems: Array<{
      id: string
      name: string
      amount: number
      categoryId: string | null
      categoryName: string | null
      payeeId: string | null
      payeeName: string | null
      isActual?: boolean
    }> = []
    const transferItems: Array<{
      id: string
      name: string
      amount: number
      direction: 'in' | 'out'
      otherAccountId: string | null
      otherAccountName: string | null
      isActual?: boolean
    }> = []
    const plannedIncomeItems: Array<{
      id: string
      name: string
      amount: number
      categoryId: string | null
      categoryName: string | null
      payeeId: string | null
      payeeName: string | null
      isActual?: boolean
    }> = []
    const plannedExpenseItems: Array<{
      id: string
      name: string
      amount: number
      categoryId: string | null
      categoryName: string | null
      payeeId: string | null
      payeeName: string | null
      isActual?: boolean
    }> = []
    const plannedTransferItems: Array<{
      id: string
      name: string
      amount: number
      direction: 'in' | 'out'
      otherAccountId: string | null
      otherAccountName: string | null
      isActual?: boolean
    }> = []

    // Add actual transactions to the totals
    transactions.docs.forEach((txn) => {
      const txnAccountId = typeof txn.account === 'string' ? txn.account : txn.account?.id

      if (txn.type === 'income') {
        income += txn.amount
        incomeCount++
        incomeItems.push({
          id: txn.id,
          name: txn.description || 'Income',
          amount: txn.amount,
          categoryId:
            typeof txn.incomeDetails?.category === 'object' && txn.incomeDetails?.category
              ? txn.incomeDetails.category.id
              : typeof txn.incomeDetails?.category === 'string'
                ? txn.incomeDetails.category
                : null,
          categoryName:
            typeof txn.incomeDetails?.category === 'object' && txn.incomeDetails?.category
              ? txn.incomeDetails.category.name
              : null,
          payeeId:
            typeof txn.incomeDetails?.payee === 'object' && txn.incomeDetails?.payee
              ? txn.incomeDetails.payee.id
              : typeof txn.incomeDetails?.payee === 'string'
                ? txn.incomeDetails.payee
                : null,
          payeeName:
            typeof txn.incomeDetails?.payee === 'object' && txn.incomeDetails?.payee
              ? txn.incomeDetails.payee.name
              : null,
          dueDate: txn.date,
          isActual: true,
        })
      } else if (txn.type === 'expense') {
        expenses += txn.amount
        expenseCount++
        expenseItems.push({
          id: txn.id,
          name: txn.description || 'Expense',
          amount: txn.amount,
          categoryId:
            typeof txn.expenseDetails?.category === 'object' && txn.expenseDetails?.category
              ? txn.expenseDetails.category.id
              : typeof txn.expenseDetails?.category === 'string'
                ? txn.expenseDetails.category
                : null,
          categoryName:
            typeof txn.expenseDetails?.category === 'object' && txn.expenseDetails?.category
              ? txn.expenseDetails.category.name
              : null,
          payeeId:
            typeof txn.expenseDetails?.payee === 'object' && txn.expenseDetails?.payee
              ? txn.expenseDetails.payee.id
              : typeof txn.expenseDetails?.payee === 'string'
                ? txn.expenseDetails.payee
                : null,
          payeeName:
            typeof txn.expenseDetails?.payee === 'object' && txn.expenseDetails?.payee
              ? txn.expenseDetails.payee.name
              : null,
          dueDate: txn.date,
          isActual: true,
        })
      } else if (txn.type === 'transfer') {
        const toAccountId =
          typeof txn.transferDetails?.toAccount === 'object' && txn.transferDetails?.toAccount
            ? txn.transferDetails.toAccount.id
            : txn.transferDetails?.toAccount

        if (txnAccountId === accountId) {
          // Transfer out from this account
          expenses += txn.amount
          transferOutCount++
          transferItems.push({
            id: txn.id,
            name: txn.description || 'Transfer Out',
            amount: txn.amount,
            direction: 'out',
            otherAccountId: typeof toAccountId === 'string' ? toAccountId : null,
            otherAccountName:
              typeof txn.transferDetails?.toAccount === 'object' && txn.transferDetails?.toAccount
                ? txn.transferDetails.toAccount.name
                : null,
            dueDate: txn.date,
            isActual: true,
          })
        }
        if (typeof toAccountId === 'string' && toAccountId === accountId) {
          // Transfer in to this account
          income += txn.amount
          transferInCount++
          transferItems.push({
            id: txn.id,
            name: txn.description || 'Transfer In',
            amount: txn.amount,
            direction: 'in',
            otherAccountId: txnAccountId || null,
            otherAccountName:
              typeof txn.account === 'object' && txn.account ? txn.account.name : null,
            dueDate: txn.date,
            isActual: true,
          })
        }
      }
    })

    // Calculate projections based on matching schedules (planned recurring items)
    recurringItems.docs.forEach((item) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scheduleType = (item as any).scheduleType
      const schedule = getSchedule(scheduleType as string)
      if (!schedule) return

      const matchesPeriod = schedule.matchesPeriod(
        item as unknown as Record<string, unknown>,
        periodStart,
        periodEnd,
      )

      if (!matchesPeriod) return

      const firstOccurrence = getFirstOccurrenceDate(
        scheduleType as string,
        item as unknown as Record<string, unknown>,
        periodStart,
        periodEnd,
      )
      const dueDate = firstOccurrence ? firstOccurrence.toISOString() : null

      if (item.itemType === 'income') {
        plannedIncomeItems.push({
          id: item.id,
          name: item.name,
          amount: item.amount,
          categoryId:
            typeof item.incomeCategory === 'object' && item.incomeCategory
              ? item.incomeCategory.id
              : item.incomeCategory || null,
          categoryName:
            typeof item.incomeCategory === 'object' && item.incomeCategory
              ? item.incomeCategory.name
              : null,
          payeeId:
            typeof item.payee === 'object' && item.payee ? item.payee.id : item.payee || null,
          payeeName: typeof item.payee === 'object' && item.payee ? item.payee.name : null,
          dueDate,
          isActual: false,
        })

        if (actualizedRecurringItemIds.has(item.id)) {
          return
        }
        income += item.amount
        incomeCount++
        incomeItems.push({
          id: item.id,
          name: item.name,
          amount: item.amount,
          categoryId:
            typeof item.incomeCategory === 'object' && item.incomeCategory
              ? item.incomeCategory.id
              : item.incomeCategory || null,
          categoryName:
            typeof item.incomeCategory === 'object' && item.incomeCategory
              ? item.incomeCategory.name
              : null,
          payeeId:
            typeof item.payee === 'object' && item.payee ? item.payee.id : item.payee || null,
          payeeName: typeof item.payee === 'object' && item.payee ? item.payee.name : null,
          dueDate,
          isActual: false,
        })
      } else if (item.itemType === 'expense') {
        plannedExpenseItems.push({
          id: item.id,
          name: item.name,
          amount: item.amount,
          categoryId:
            typeof item.expenseCategory === 'object' && item.expenseCategory
              ? item.expenseCategory.id
              : item.expenseCategory || null,
          categoryName:
            typeof item.expenseCategory === 'object' && item.expenseCategory
              ? item.expenseCategory.name
              : null,
          payeeId:
            typeof item.payee === 'object' && item.payee ? item.payee.id : item.payee || null,
          payeeName: typeof item.payee === 'object' && item.payee ? item.payee.name : null,
          dueDate,
          isActual: false,
        })

        if (actualizedRecurringItemIds.has(item.id)) {
          return
        }
        expenses += item.amount
        expenseCount++
        expenseItems.push({
          id: item.id,
          name: item.name,
          amount: item.amount,
          categoryId:
            typeof item.expenseCategory === 'object' && item.expenseCategory
              ? item.expenseCategory.id
              : item.expenseCategory || null,
          categoryName:
            typeof item.expenseCategory === 'object' && item.expenseCategory
              ? item.expenseCategory.name
              : null,
          payeeId:
            typeof item.payee === 'object' && item.payee ? item.payee.id : item.payee || null,
          payeeName: typeof item.payee === 'object' && item.payee ? item.payee.name : null,
          dueDate,
          isActual: false,
        })
      } else if (item.itemType === 'transfer') {
        const itemData = item as unknown as Record<string, unknown>
        const fromAccountId =
          typeof itemData.fromAccount === 'object' &&
          itemData.fromAccount &&
          'id' in itemData.fromAccount
            ? (itemData.fromAccount as { id: string }).id
            : (itemData.fromAccount as string)
        const toAccountId =
          typeof itemData.toAccount === 'object' && itemData.toAccount && 'id' in itemData.toAccount
            ? (itemData.toAccount as { id: string }).id
            : (itemData.toAccount as string)

        if (fromAccountId === accountId) {
          // Money leaving this account
          plannedTransferItems.push({
            id: item.id,
            name: item.name,
            amount: item.amount,
            direction: 'out',
            otherAccountId: toAccountId,
            otherAccountName:
              typeof itemData.toAccount === 'object' &&
              itemData.toAccount &&
              'name' in itemData.toAccount
                ? (itemData.toAccount as { name: string }).name
                : null,
            dueDate,
            isActual: false,
          })

          if (actualizedRecurringItemIds.has(item.id)) {
            return
          }
          expenses += item.amount
          transferOutCount++
          transferItems.push({
            id: item.id,
            name: item.name,
            amount: item.amount,
            direction: 'out',
            otherAccountId: toAccountId,
            otherAccountName:
              typeof itemData.toAccount === 'object' &&
              itemData.toAccount &&
              'name' in itemData.toAccount
                ? (itemData.toAccount as { name: string }).name
                : null,
            dueDate,
            isActual: false,
          })
        }
        if (toAccountId === accountId) {
          // Money coming into this account
          plannedTransferItems.push({
            id: item.id,
            name: item.name,
            amount: item.amount,
            direction: 'in',
            otherAccountId: fromAccountId,
            otherAccountName:
              typeof itemData.fromAccount === 'object' &&
              itemData.fromAccount &&
              'name' in itemData.fromAccount
                ? (itemData.fromAccount as { name: string }).name
                : null,
            dueDate,
            isActual: false,
          })

          if (actualizedRecurringItemIds.has(item.id)) {
            return
          }
          income += item.amount
          transferInCount++
          transferItems.push({
            id: item.id,
            name: item.name,
            amount: item.amount,
            direction: 'in',
            otherAccountId: fromAccountId,
            otherAccountName:
              typeof itemData.fromAccount === 'object' &&
              itemData.fromAccount &&
              'name' in itemData.fromAccount
                ? (itemData.fromAccount as { name: string }).name
                : null,
            dueDate,
            isActual: false,
          })
        }
      }
    })

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error('Error calculating budget projections:', error)
    return NextResponse.json({ error: 'Failed to calculate projections' }, { status: 500 })
  }
}
