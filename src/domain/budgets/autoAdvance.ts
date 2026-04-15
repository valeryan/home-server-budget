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
  startDate.setUTCDate(startDate.getUTCDate() + 1) // Day after last period ends
  startDate.setUTCHours(0, 0, 0, 0)

  // For weekly schedules with specific day, adjust startDate to match
  if (scheduleType === 'weekly' && schedule.dayOfWeek) {
    const targetDayOfWeek = parseInt(schedule.dayOfWeek)
    while (startDate.getUTCDay() !== targetDayOfWeek) {
      startDate.setUTCDate(startDate.getUTCDate() + 1)
    }
  } else if (scheduleType === 'monthly' && schedule.dayOfMonth) {
    const targetDay =
      schedule.dayOfMonth === 'last'
        ? new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0)).getUTCDate()
        : parseInt(schedule.dayOfMonth)

    if (startDate.getUTCDate() > targetDay) {
      startDate.setUTCMonth(startDate.getUTCMonth() + 1)
    }
    const lastDayOfMonth = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0)).getUTCDate()
    startDate.setUTCDate(Math.min(targetDay, lastDayOfMonth))
  }

  const endDate = new Date(startDate)

  switch (scheduleType) {
    case 'weekly':
      endDate.setUTCDate(endDate.getUTCDate() + 6)
      break
    case 'biweekly':
      endDate.setUTCDate(endDate.getUTCDate() + 13)
      break
    case 'monthly':
      endDate.setUTCMonth(endDate.getUTCMonth() + 1)
      endDate.setUTCDate(endDate.getUTCDate() - 1)
      break
    case 'bimonthly_1_15':
      if (startDate.getUTCDate() === 1) {
        endDate.setUTCDate(14)
      } else {
        endDate.setUTCMonth(endDate.getUTCMonth() + 1)
        endDate.setUTCDate(0) // Last day of previous month
      }
      break
    case 'bimonthly_15_last':
      if (startDate.getUTCDate() === 15) {
        endDate.setUTCMonth(endDate.getUTCMonth() + 1)
        endDate.setUTCDate(0) // Last day of current month
      } else {
        endDate.setUTCDate(14)
      }
      break
    case 'quarterly':
      endDate.setUTCMonth(endDate.getUTCMonth() + 3)
      endDate.setUTCDate(endDate.getUTCDate() - 1)
      break
    case 'semiannually':
      endDate.setUTCMonth(endDate.getUTCMonth() + 6)
      endDate.setUTCDate(endDate.getUTCDate() - 1)
      break
    case 'annually':
      endDate.setUTCFullYear(endDate.getUTCFullYear() + 1)
      endDate.setUTCDate(endDate.getUTCDate() - 1)
      break
    default:
      endDate.setUTCDate(endDate.getUTCDate() + 13)
  }

  endDate.setUTCHours(23, 59, 59, 999)

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

  // Find the last budget end date to chain from
  const lastBudget = updatedDocs[updatedDocs.length - 1]

  let lastEndDate: Date

  if (lastBudget) {
    lastEndDate = new Date(lastBudget.endDate)
  } else if (schedule.scheduleType === 'biweekly' && schedule.anchorDate) {
    // No budgets at all — jump to the period covering today using the anchor
    const anchorDate = new Date(schedule.anchorDate)
    anchorDate.setHours(0, 0, 0, 0)
    const daysSinceAnchor = Math.floor(
      (now.getTime() - anchorDate.getTime()) / (24 * 60 * 60 * 1000),
    )
    const periodsSinceAnchor = Math.floor(daysSinceAnchor / 14)
    const currentPeriodStart = new Date(anchorDate)
    currentPeriodStart.setDate(currentPeriodStart.getDate() + periodsSinceAnchor * 14)
    lastEndDate = new Date(currentPeriodStart)
    lastEndDate.setDate(lastEndDate.getDate() - 1)
    lastEndDate.setHours(23, 59, 59, 999)
  } else {
    lastEndDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    lastEndDate.setHours(23, 59, 59, 999)
  }

  // Generate periods from lastEndDate until we have lookAhead future (planning) periods.
  // This fills the entire gap no matter how many periods were missed.
  let planningCreated = 0
  const MAX_PERIODS = 200 // safety cap

  for (let i = 0; i < MAX_PERIODS; i++) {
    const { startDate, endDate } = calculateNextPeriod(schedule, lastEndDate)

    // Determine correct status for this period
    let status: 'closed' | 'active' | 'planning'
    if (endDate < now) {
      status = 'closed'
    } else if (startDate <= now) {
      status = 'active'
    } else {
      status = 'planning'
      planningCreated++
    }

    const existing = await payload.find({
      collection: 'budgets',
      where: {
        account: { equals: accountId },
        startDate: { equals: startDate.toISOString() },
      },
      limit: 1,
    })

    if (existing.docs.length === 0) {
      await payload.create({
        collection: 'budgets',
        data: {
          name: formatBudgetName(schedule.budgetNamePattern, startDate, endDate),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          status,
          account: accountId,
        },
      })
      created++
    }

    lastEndDate = endDate

    // Stop once we have covered today and built the required lookahead
    if (planningCreated >= schedule.lookAhead) break
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
