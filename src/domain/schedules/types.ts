/**
 * Schedule Type System
 *
 * This defines the types and interfaces for the schedule registry.
 * Each schedule type specifies what fields it needs and provides logic
 * to determine if a recurring item belongs in a given budget period.
 */

import type { Field } from 'payload'

export type ScheduleType =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'bimonthly_1_15'
  | 'bimonthly_15_last'
  | 'quarterly'
  | 'semiannually'
  | 'annually'

export interface ScheduleDefinition {
  type: ScheduleType
  name: string
  description: string
  /**
   * Fields that will be added to recurring items when this schedule is selected.
   * These will be conditionally shown in the Payload UI.
   */
  requiredFields: Field[]
  /**
   * Determines if a recurring item with this schedule belongs in the given budget period.
   * @param itemData - The recurring item data (includes schedule-specific fields)
   * @param periodStart - Start date of the budget period
   * @param periodEnd - End date of the budget period
   * @returns true if the item should be included in this period
   */
  matchesPeriod: (itemData: Record<string, unknown>, periodStart: Date, periodEnd: Date) => boolean
}

/**
 * Data structure for schedule-specific fields stored on recurring items
 */
export interface WeeklyScheduleData {
  scheduleType: 'weekly'
  dayOfWeek: number // 0-6 (Sunday-Saturday)
}

export interface BiweeklyScheduleData {
  scheduleType: 'biweekly'
  anchorDate: string // ISO date string - when did this bi-weekly cycle start?
  dayOfWeek: number // 0-6 (Sunday-Saturday)
}

export interface MonthlyScheduleData {
  scheduleType: 'monthly'
  dayOfMonth: number | 'last' // 1-31 or "last"
}

export interface BimonthlyScheduleData {
  scheduleType: 'bimonthly_1_15' | 'bimonthly_15_last'
  // No additional fields needed - dates are fixed
}

export interface QuarterlyScheduleData {
  scheduleType: 'quarterly'
  anchorDate: string // ISO date string - the first occurrence date
}

export interface SemiannuallyScheduleData {
  scheduleType: 'semiannually'
  anchorDate: string // ISO date string - the first occurrence date
}

export interface AnnuallyScheduleData {
  scheduleType: 'annually'
  month: number // 1-12
  dayOfMonth: number // 1-31
}

export type ScheduleData =
  | WeeklyScheduleData
  | BiweeklyScheduleData
  | MonthlyScheduleData
  | BimonthlyScheduleData
  | QuarterlyScheduleData
  | SemiannuallyScheduleData
  | AnnuallyScheduleData
