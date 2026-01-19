import type { Payload } from 'payload'

export async function calculateStartingBalance(
  payload: Payload,
  accountId: string,
  budgetId: string | null,
  periodStart: Date,
): Promise<number> {
  const account = await payload.findByID({
    collection: 'accounts',
    id: accountId,
  })

  // If we have a budgetId, try to find the previous budget
  if (budgetId) {
    const currentBudget = await payload.findByID({
      collection: 'budgets',
      id: budgetId,
    })

    // ANCHOR LOGIC:
    // If the budget is Active or Closed, we want its Starting Balance to be "Real" (based on actual ledger).
    // We strictly IGNORE the previous budget's projection in this case.
    // Only 'planning' budgets should chain off the previous budget's projected ending balance.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shouldRecurse = (currentBudget as any).status === 'planning'

    if (shouldRecurse) {
      // Find the previous budget (ended before this one starts)
      const previousBudgets = await payload.find({
        collection: 'budgets',
        where: {
          and: [
            {
              account: {
                equals: accountId,
              },
            },
            {
              endDate: {
                less_than: currentBudget.startDate,
              },
            },
          ],
        },
        sort: '-endDate',
        limit: 1,
      })

      if (previousBudgets.docs.length > 0) {
        const prevBudget = previousBudgets.docs[0]
        const prevPeriodStart = new Date(prevBudget.startDate)
        prevPeriodStart.setUTCHours(0, 0, 0, 0)
        const prevPeriodEnd = new Date(prevBudget.endDate)
        prevPeriodEnd.setUTCHours(23, 59, 59, 999)

        // Recursively calculate the previous budget's starting balance
        const prevStartingBalance = await calculateStartingBalance(
          payload,
          accountId,
          prevBudget.id,
          prevPeriodStart,
        )

        // Ensure we have a valid number
        if (typeof prevStartingBalance !== 'number' || isNaN(prevStartingBalance)) {
          throw new Error('Failed to calculate previous budget starting balance')
        }

        // Get all transactions and projections in previous period
        const prevTransactions = await payload.find({
          collection: 'transactions',
          where: {
            and: [
              {
                date: {
                  greater_than_equal: prevPeriodStart.toISOString(),
                },
              },
              {
                date: {
                  less_than_equal: prevPeriodEnd.toISOString(),
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
          limit: 10000,
        })

        // Calculate what the balance would be at the end of the previous period
        let prevEndBalance = prevStartingBalance

        prevTransactions.docs.forEach((txn) => {
          const txnAccountId = typeof txn.account === 'string' ? txn.account : txn.account?.id

          if (txn.type === 'income') {
            prevEndBalance += txn.amount
          } else if (txn.type === 'expense') {
            prevEndBalance -= txn.amount
          } else if (txn.type === 'transfer') {
            const toAccountId =
              typeof txn.transferDetails?.toAccount === 'object' && txn.transferDetails?.toAccount
                ? txn.transferDetails.toAccount.id
                : txn.transferDetails?.toAccount

            if (txnAccountId === accountId) {
              prevEndBalance -= txn.amount
            }
            if (typeof toAccountId === 'string' && toAccountId === accountId) {
              prevEndBalance += txn.amount
            }
          }
        })

        return prevEndBalance
      }
    }
  }

  // No previous budget OR Active/Closed Budget - calculation from account starting balance + transactions before period
  const transactionsBeforePeriod = await payload.find({
    collection: 'transactions',
    where: {
      and: [
        {
          date: {
            less_than: periodStart.toISOString(),
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
    sort: 'date',
    limit: 10000,
  })

  let balance = typeof account.startingBalance === 'number' ? account.startingBalance : 0

  transactionsBeforePeriod.docs.forEach((txn) => {
    const txnAccountId = typeof txn.account === 'string' ? txn.account : txn.account?.id

    if (txn.type === 'income') {
      balance += txn.amount
    } else if (txn.type === 'expense') {
      balance -= txn.amount
    } else if (txn.type === 'transfer') {
      const toAccountId =
        typeof txn.transferDetails?.toAccount === 'object' && txn.transferDetails?.toAccount
          ? txn.transferDetails.toAccount.id
          : txn.transferDetails?.toAccount

      if (txnAccountId === accountId) {
        balance -= txn.amount
      }
      if (typeof toAccountId === 'string' && toAccountId === accountId) {
        balance += txn.amount
      }
    }
  })

  return balance
}
