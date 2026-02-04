import type { Payload } from 'payload'

interface BudgetSchedule {
  id: string
  account: string | { id: string }
  scheduleType: string
  budgetNamePattern: string
  isActive: boolean
  lookAhead: number
  // Schedule detail fields
  dayOfWeek?: string
  anchorDate?: string
  dayOfMonth?: string
  month?: string
}

interface Budget {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'planning' | 'active' | 'closed'
  account: string | { id: string }
}

/**
 * Calculate the next budget period dates based on schedule
 * Uses the schedule details to determine the correct start date
 */
function calculateNextPeriod(
  schedule: BudgetSchedule,
  lastEndDate: Date,
): { startDate: Date; endDate: Date } {
  const scheduleType = schedule.scheduleType
  const startDate = new Date(lastEndDate)
  startDate.setDate(startDate.getDate() + 1) // Day after last period ends
  startDate.setHours(0, 0, 0, 0)

  // For weekly schedules with specific day, adjust startDate to match
  if (scheduleType === 'weekly' && schedule.dayOfWeek) {
    const targetDayOfWeek = parseInt(schedule.dayOfWeek)

    // Find the next occurrence of the target day
    while (startDate.getDay() !== targetDayOfWeek) {
      startDate.setDate(startDate.getDate() + 1)
    }
  } else if (scheduleType === 'monthly' && schedule.dayOfMonth) {
    const targetDay =
      schedule.dayOfMonth === 'last'
        ? new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate()
        : parseInt(schedule.dayOfMonth)

    // If we're past the target day this month, go to next month
    if (startDate.getDate() > targetDay) {
      startDate.setMonth(startDate.getMonth() + 1)
    }
    startDate.setDate(
      Math.min(targetDay, new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate()),
    )
  }

  const endDate = new Date(startDate)

  // Calculate period length based on schedule type
  switch (scheduleType) {
    case 'weekly':
      endDate.setDate(endDate.getDate() + 6)
      break
    case 'biweekly':
      endDate.setDate(endDate.getDate() + 13)
      break
    case 'monthly':
      // End on the day before the same day next month
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(endDate.getDate() - 1)
      break
    case 'bimonthly_1_15':
      // If starting on 1st, end on 14th; if starting on 15th, end on last day of month
      if (startDate.getDate() === 1) {
        endDate.setDate(14)
      } else {
        endDate.setMonth(endDate.getMonth() + 1)
        endDate.setDate(0) // Last day of previous month
      }
      break
    case 'bimonthly_15_last':
      // If starting on 15th, end on last day; if starting on 1st of next month, end on 14th
      if (startDate.getDate() === 15) {
        endDate.setMonth(endDate.getMonth() + 1)
        endDate.setDate(0) // Last day of month
      } else {
        endDate.setDate(14)
      }
      break
    case 'quarterly':
      endDate.setMonth(endDate.getMonth() + 3)
      endDate.setDate(endDate.getDate() - 1)
      break
    case 'semiannually':
      endDate.setMonth(endDate.getMonth() + 6)
      endDate.setDate(endDate.getDate() - 1)
      break
    case 'annually':
      endDate.setFullYear(endDate.getFullYear() + 1)
      endDate.setDate(endDate.getDate() - 1)
      break
    default:
      // Default to bi-weekly if unknown
      endDate.setDate(endDate.getDate() + 13)
  }

  endDate.setHours(23, 59, 59, 999)

  return { startDate, endDate }
}

/**
 * Format budget name from pattern
 */
function formatBudgetName(pattern: string, startDate: Date, endDate: Date): string {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return pattern.replace('{start}', formatDate(startDate)).replace('{end}', formatDate(endDate))
}

/**
 * Auto-advance budgets for an account based on its schedule
 * - Close expired active budgets
 * - Activate planned budgets that should be active
 * - Create new planned budgets to maintain lookAhead count
 */
export async function autoAdvanceBudgets(
  payload: Payload,
  accountId: string,
): Promise<{ closed: number; activated: number; created: number }> {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  let closed = 0
  let activated = 0
  let created = 0

  // Get the schedule for this account
  const schedules = await payload.find({
    collection: 'budget-schedules',
    where: {
      account: { equals: accountId },
      isActive: { equals: true },
    },
    limit: 1,
  })

  if (schedules.docs.length === 0) {
    return { closed, activated, created }
  }

  const schedule = schedules.docs[0] as unknown as BudgetSchedule

  // Get all budgets for this account
  const budgets = await payload.find({
    collection: 'budgets',
    where: {
      account: { equals: accountId },
    },
    sort: 'startDate',
    limit: 100,
  })

  const budgetDocs = budgets.docs as unknown as Budget[]

  // Close any active budgets past their end date
  for (const budget of budgetDocs) {
    if (budget.status === 'active') {
      const endDate = new Date(budget.endDate)
      endDate.setHours(0, 0, 0, 0)

      if (endDate < now) {
        await payload.update({
          collection: 'budgets',
          id: budget.id,
          data: { status: 'closed' },
        })
        closed++
      }
    }
  }

  // Activate any planning budgets that should be active
  for (const budget of budgetDocs) {
    if (budget.status === 'planning') {
      const startDate = new Date(budget.startDate)
      startDate.setHours(0, 0, 0, 0)

      if (startDate <= now) {
        await payload.update({
          collection: 'budgets',
          id: budget.id,
          data: { status: 'active' },
        })
        activated++
      }
    }
  }

  // Refresh budget list after updates
  const updatedBudgets = await payload.find({
    collection: 'budgets',
    where: {
      account: { equals: accountId },
    },
    sort: 'startDate',
    limit: 100,
  })

  const updatedDocs = updatedBudgets.docs as unknown as Budget[]
  const planningBudgets = updatedDocs.filter((b) => b.status === 'planning')
  const hasActiveBudget = updatedDocs.some((b) => b.status === 'active')

  // Ensure we always have one current active budget, plus lookAhead planned budgets
  const neededBudgets = schedule.lookAhead - planningBudgets.length + (hasActiveBudget ? 0 : 1)

  if (neededBudgets > 0) {
    // Find the last budget to calculate from
    const lastBudget = updatedDocs[updatedDocs.length - 1]

    let lastEndDate: Date = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    lastEndDate.setHours(23, 59, 59, 999)

    if (lastBudget) {
      lastEndDate = new Date(lastBudget.endDate)
    } else {
      // No budgets exist - find which period we're in based on the anchor date
      if (schedule.scheduleType === 'biweekly' && schedule.anchorDate) {
        const anchorDate = new Date(schedule.anchorDate)
        anchorDate.setHours(0, 0, 0, 0)

        // Calculate how many 14-day periods have passed since the anchor
        const daysSinceAnchor = Math.floor(
          (now.getTime() - anchorDate.getTime()) / (24 * 60 * 60 * 1000),
        )
        const periodsSinceAnchor = Math.floor(daysSinceAnchor / 14)

        // Find the start of the current period
        const currentPeriodStart = new Date(anchorDate)
        currentPeriodStart.setDate(currentPeriodStart.getDate() + periodsSinceAnchor * 14)

        // Set lastEndDate to one day before the current period starts
        lastEndDate = new Date(currentPeriodStart)
        lastEndDate.setDate(lastEndDate.getDate() - 1)
        lastEndDate.setHours(23, 59, 59, 999)
      } else {
        // For other schedule types, start from yesterday
        lastEndDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        lastEndDate.setHours(23, 59, 59, 999)
      }
    }

    for (let i = 0; i < neededBudgets; i++) {
      const { startDate, endDate } = calculateNextPeriod(schedule, lastEndDate)

      const name = formatBudgetName(schedule.budgetNamePattern, startDate, endDate)

      const existing = await payload.find({
        collection: 'budgets',
        where: {
          account: { equals: accountId },
          startDate: { equals: startDate.toISOString() },
          endDate: { equals: endDate.toISOString() },
        },
        limit: 1,
      })

      if (existing.docs.length === 0) {
        await payload.create({
          collection: 'budgets',
          data: {
            name,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            status: startDate <= now ? 'active' : 'planning',
            account: accountId,
          },
        })

        created++
      }

      lastEndDate = endDate
    }
  }

  return { closed, activated, created }
}

/**
 * Check and auto-advance budgets for all active schedules
 */
export async function autoAdvanceAllBudgets(payload: Payload) {
  const schedules = await payload.find({
    collection: 'budget-schedules',
    where: {
      isActive: { equals: true },
    },
  })

  const results = []

  for (const schedule of schedules.docs) {
    const sched = schedule as unknown as BudgetSchedule
    const accountId = typeof sched.account === 'string' ? sched.account : sched.account.id

    const result = await autoAdvanceBudgets(payload, accountId)
    results.push({ accountId, ...result })
  }

  return results
}
