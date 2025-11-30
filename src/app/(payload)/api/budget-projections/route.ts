import { getSchedule } from '@/lib/schedules'
import config from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const accountId = searchParams.get('account')

  if (!startDate || !endDate || !accountId) {
    return NextResponse.json(
      { error: 'Missing required parameters: startDate, endDate, account' },
      { status: 400 },
    )
  }

  try {
    const payload = await getPayload({ config })

    const periodStart = new Date(startDate)
    const periodEnd = new Date(endDate)

    // Fetch the account to get current balance
    const account = await payload.findByID({
      collection: 'accounts',
      id: accountId,
    })

    const currentBalance = account.currentBalance || 0

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

    let income = 0
    let expenses = 0
    let incomeCount = 0
    let expenseCount = 0
    let transferInCount = 0
    let transferOutCount = 0

    // Calculate projections based on matching schedules
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

      if (item.itemType === 'income') {
        income += item.amount
        incomeCount++
      } else if (item.itemType === 'expense') {
        expenses += item.amount
        expenseCount++
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
          expenses += item.amount
          transferOutCount++
        }
        if (toAccountId === accountId) {
          // Money coming into this account
          income += item.amount
          transferInCount++
        }
      }
    })

    return NextResponse.json({
      currentBalance,
      income,
      expenses,
      projectedBalance: currentBalance + income - expenses,
      incomeCount,
      expenseCount,
      transferInCount,
      transferOutCount,
    })
  } catch (error) {
    console.error('Error calculating budget projections:', error)
    return NextResponse.json({ error: 'Failed to calculate projections' }, { status: 500 })
  }
}
