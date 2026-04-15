/**
 * Schedule Utility Functions
 *
 * Helper functions for date calculations and schedule matching
 */

/**
 * Get the last day of a given month (UTC-safe)
 */
export function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month + 1, 0))
}

/**
 * Check if a date falls within a range (inclusive) — compares UTC date-only values
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const dateOnly = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  const startOnly = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  const endOnly = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  return dateOnly >= startOnly && dateOnly <= endOnly
}

/**
 * Get day of week (0-6, Sunday-Saturday) — uses UTC to avoid timezone shifts
 */
export function getDayOfWeek(date: Date): number {
  return date.getUTCDay()
}

/**
 * Calculate the number of whole weeks between two dates.
 * Uses UTC date components so DST transitions never affect the result.
 */
export function getWeeksBetween(date1: Date, date2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  const utc1 = Date.UTC(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate())
  const utc2 = Date.UTC(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate())
  // Math.round before dividing avoids floating-point drift on exact multiples
  const days = Math.round(Math.abs(utc2 - utc1) / msPerDay)
  return Math.floor(days / 7)
}

/**
 * Calculate the number of months between two dates (UTC)
 */
export function getMonthsBetween(date1: Date, date2: Date): number {
  const yearDiff = date2.getUTCFullYear() - date1.getUTCFullYear()
  const monthDiff = date2.getUTCMonth() - date1.getUTCMonth()
  return yearDiff * 12 + monthDiff
}

/**
 * Normalize a date to UTC midnight — strips time component in a timezone-safe way.
 * Always use this before comparing schedule dates so anchor dates (stored as UTC
 * ISO strings from the DB) and computed dates are on the same footing.
 */
export function normalizeDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addMonths(date: Date, months: number): Date {
  // Work in UTC to avoid DST/local-midnight issues
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  const newMonth = month + months
  // Date.UTC auto-overflows month correctly; clamp to last day of target month
  const candidate = new Date(Date.UTC(year, newMonth, day))
  // If day overflowed (e.g. Mar 31 + 1 month → Apr 31 → May 1), clamp to last day of April
  if (candidate.getUTCDate() !== day) {
    return new Date(Date.UTC(year, newMonth + 1, 0)) // last day of target month
  }
  return candidate
}

export function getFirstOccurrenceDate(
  scheduleType: string,
  itemData: Record<string, unknown>,
  periodStart: Date,
  periodEnd: Date,
): Date | null {
  // All dates normalized to UTC midnight so comparisons are timezone-safe
  const start = normalizeDate(periodStart)
  const end = normalizeDate(periodEnd)

  switch (scheduleType) {
    case 'weekly': {
      const dayOfWeek = parseInt(String(itemData.dayOfWeek ?? '0'))
      const d = new Date(start)
      const diff = (dayOfWeek - d.getUTCDay() + 7) % 7
      d.setUTCDate(d.getUTCDate() + diff)
      return d <= end ? d : null
    }
    case 'biweekly': {
      // Normalize anchor through UTC components so Payload-stored dates are safe
      const anchorDate = normalizeDate(new Date(String(itemData.anchorDate ?? new Date().toISOString())))
      const dayOfWeek = parseInt(String(itemData.dayOfWeek ?? '0'))
      const d = new Date(start)
      const diff = (dayOfWeek - d.getUTCDay() + 7) % 7
      d.setUTCDate(d.getUTCDate() + diff)
      while (d <= end) {
        const weeksBetween = getWeeksBetween(anchorDate, d)
        if (weeksBetween % 2 === 0) return d
        d.setUTCDate(d.getUTCDate() + 7)
      }
      return null
    }
    case 'monthly': {
      const dayOfMonth = itemData.dayOfMonth
      const cursor = new Date(start)
      let lastMonth = -1
      while (cursor <= end) {
        const m = cursor.getUTCMonth()
        const y = cursor.getUTCFullYear()
        if (m !== lastMonth) {
          lastMonth = m
          let target: Date
          if (dayOfMonth === 'last') {
            target = getLastDayOfMonth(y, m)
          } else {
            const day = parseInt(String(dayOfMonth ?? '1'))
            const lastDay = getLastDayOfMonth(y, m).getUTCDate()
            target = new Date(Date.UTC(y, m, Math.min(day, lastDay)))
          }
          if (isDateInRange(target, start, end)) return target
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      }
      return null
    }
    case 'bimonthly_1_15': {
      const cursor = new Date(start)
      let lastMonth = -1
      while (cursor <= end) {
        const m = cursor.getUTCMonth()
        const y = cursor.getUTCFullYear()
        if (m !== lastMonth) {
          lastMonth = m
          const first = new Date(Date.UTC(y, m, 1))
          const fifteenth = new Date(Date.UTC(y, m, 15))
          if (isDateInRange(first, start, end)) return first
          if (isDateInRange(fifteenth, start, end)) return fifteenth
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      }
      return null
    }
    case 'bimonthly_15_last': {
      const cursor = new Date(start)
      let lastMonth = -1
      while (cursor <= end) {
        const m = cursor.getUTCMonth()
        const y = cursor.getUTCFullYear()
        if (m !== lastMonth) {
          lastMonth = m
          const fifteenth = new Date(Date.UTC(y, m, 15))
          const last = getLastDayOfMonth(y, m)
          if (isDateInRange(fifteenth, start, end)) return fifteenth
          if (isDateInRange(last, start, end)) return last
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      }
      return null
    }
    case 'quarterly': {
      const anchorDate = normalizeDate(new Date(String(itemData.anchorDate ?? new Date().toISOString())))
      const monthsBetween = getMonthsBetween(anchorDate, start)
      const step = Math.floor(monthsBetween / 3) * 3
      let candidate = addMonths(anchorDate, step)
      while (candidate < start) {
        candidate = addMonths(candidate, 3)
      }
      return candidate <= end ? candidate : null
    }
    case 'semiannually': {
      const anchorDate = normalizeDate(new Date(String(itemData.anchorDate ?? new Date().toISOString())))
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
      for (let year = start.getUTCFullYear(); year <= end.getUTCFullYear(); year++) {
        let target: Date
        if (dayOfMonth === 'last') {
          target = getLastDayOfMonth(year, month)
        } else {
          const day = parseInt(String(dayOfMonth ?? '1'))
          const lastDay = getLastDayOfMonth(year, month).getUTCDate()
          target = new Date(Date.UTC(year, month, Math.min(day, lastDay)))
        }
        if (isDateInRange(target, start, end)) return target
      }
      return null
    }
    default:
      return null
  }
}
