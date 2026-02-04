/**
 * Schedule Utility Functions
 *
 * Helper functions for date calculations and schedule matching
 */

/**
 * Get the last day of a given month
 */
export function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0)
}

/**
 * Check if a date falls within a range (inclusive)
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate())

  return dateOnly >= startOnly && dateOnly <= endOnly
}

/**
 * Get day of week (0-6, Sunday-Saturday)
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay()
}

/**
 * Calculate the number of weeks between two dates
 */
export function getWeeksBetween(date1: Date, date2: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const diff = Math.abs(date2.getTime() - date1.getTime())
  return Math.floor(diff / msPerWeek)
}

/**
 * Calculate the number of months between two dates
 */
export function getMonthsBetween(date1: Date, date2: Date): number {
  const yearDiff = date2.getFullYear() - date1.getFullYear()
  const monthDiff = date2.getMonth() - date1.getMonth()
  return yearDiff * 12 + monthDiff
}

/**
 * Normalize a date to midnight (removes time component)
 */
export function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  const day = d.getDate()
  d.setMonth(d.getMonth() + months)
  // If month rollover happened (e.g., Feb 30), clamp to last day of month
  if (d.getDate() < day) {
    d.setDate(0)
  }
  return d
}

export function getFirstOccurrenceDate(
  scheduleType: string,
  itemData: Record<string, unknown>,
  periodStart: Date,
  periodEnd: Date,
): Date | null {
  const start = normalizeDate(periodStart)
  const end = normalizeDate(periodEnd)

  switch (scheduleType) {
    case 'weekly': {
      const dayOfWeek = parseInt(String(itemData.dayOfWeek ?? '0'))
      const d = new Date(start)
      const diff = (dayOfWeek - d.getDay() + 7) % 7
      d.setDate(d.getDate() + diff)
      return d <= end ? d : null
    }
    case 'biweekly': {
      const anchorDate = new Date(String(itemData.anchorDate ?? new Date()))
      const dayOfWeek = parseInt(String(itemData.dayOfWeek ?? '0'))
      const d = new Date(start)
      const diff = (dayOfWeek - d.getDay() + 7) % 7
      d.setDate(d.getDate() + diff)
      while (d <= end) {
        const weeksBetween = getWeeksBetween(anchorDate, d)
        if (weeksBetween % 2 === 0) return d
        d.setDate(d.getDate() + 7)
      }
      return null
    }
    case 'monthly': {
      const dayOfMonth = itemData.dayOfMonth
      const cursor = new Date(start)
      const monthsChecked = new Set<string>()
      while (cursor <= end) {
        const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`
        if (!monthsChecked.has(monthKey)) {
          monthsChecked.add(monthKey)
          let target: Date
          if (dayOfMonth === 'last') {
            target = getLastDayOfMonth(cursor.getFullYear(), cursor.getMonth())
          } else {
            const day = parseInt(String(dayOfMonth ?? '1'))
            const lastDay = getLastDayOfMonth(cursor.getFullYear(), cursor.getMonth()).getDate()
            target = new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(day, lastDay))
          }
          if (isDateInRange(target, start, end)) return target
        }
        cursor.setDate(cursor.getDate() + 1)
      }
      return null
    }
    case 'bimonthly_1_15': {
      const cursor = new Date(start)
      const monthsChecked = new Set<string>()
      while (cursor <= end) {
        const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`
        if (!monthsChecked.has(monthKey)) {
          monthsChecked.add(monthKey)
          const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
          const fifteenth = new Date(cursor.getFullYear(), cursor.getMonth(), 15)
          if (isDateInRange(first, start, end)) return first
          if (isDateInRange(fifteenth, start, end)) return fifteenth
        }
        cursor.setDate(cursor.getDate() + 1)
      }
      return null
    }
    case 'bimonthly_15_last': {
      const cursor = new Date(start)
      const monthsChecked = new Set<string>()
      while (cursor <= end) {
        const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`
        if (!monthsChecked.has(monthKey)) {
          monthsChecked.add(monthKey)
          const fifteenth = new Date(cursor.getFullYear(), cursor.getMonth(), 15)
          const last = getLastDayOfMonth(cursor.getFullYear(), cursor.getMonth())
          if (isDateInRange(fifteenth, start, end)) return fifteenth
          if (isDateInRange(last, start, end)) return last
        }
        cursor.setDate(cursor.getDate() + 1)
      }
      return null
    }
    case 'quarterly': {
      const anchorDate = normalizeDate(new Date(String(itemData.anchorDate ?? new Date())))
      const monthsBetween = getMonthsBetween(anchorDate, start)
      const step = Math.floor(monthsBetween / 3) * 3
      let candidate = addMonths(anchorDate, step)
      while (candidate < start) {
        candidate = addMonths(candidate, 3)
      }
      return candidate <= end ? candidate : null
    }
    case 'semiannually': {
      const anchorDate = normalizeDate(new Date(String(itemData.anchorDate ?? new Date())))
      const monthsBetween = getMonthsBetween(anchorDate, start)
      const step = Math.floor(monthsBetween / 6) * 6
      let candidate = addMonths(anchorDate, step)
      while (candidate < start) {
        candidate = addMonths(candidate, 6)
      }
      return candidate <= end ? candidate : null
    }
    case 'annually': {
      const month = parseInt(String(itemData.month ?? '1')) - 1
      const dayOfMonth = itemData.dayOfMonth
      for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
        let target: Date
        if (dayOfMonth === 'last') {
          target = getLastDayOfMonth(year, month)
        } else {
          const day = parseInt(String(dayOfMonth ?? '1'))
          const lastDay = getLastDayOfMonth(year, month).getDate()
          target = new Date(year, month, Math.min(day, lastDay))
        }
        if (isDateInRange(target, start, end)) return target
      }
      return null
    }
    default:
      return null
  }
}
