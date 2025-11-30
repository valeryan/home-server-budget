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
