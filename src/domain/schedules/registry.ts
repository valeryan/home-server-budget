/**
 * Schedule Registry
 *
 * This is the single source of truth for all supported schedule types.
 * Each schedule defines:
 * 1. What fields it needs (shown conditionally in the UI)
 * 2. How to determine if a recurring item belongs in a budget period
 */

import type { Field } from 'payload'
import type { ScheduleDefinition } from '@/domain/schedules/types'
import {
  getDayOfWeek,
  getLastDayOfMonth,
  getWeeksBetween,
  isDateInRange,
} from '@/domain/schedules/utils'

// Reusable option constants - exported for use in index.ts
export const DAYS_OF_WEEK_OPTIONS = [
  { label: 'Sunday', value: '0' },
  { label: 'Monday', value: '1' },
  { label: 'Tuesday', value: '2' },
  { label: 'Wednesday', value: '3' },
  { label: 'Thursday', value: '4' },
  { label: 'Friday', value: '5' },
  { label: 'Saturday', value: '6' },
]

export const MONTHS_OPTIONS = [
  { label: 'January', value: '1' },
  { label: 'February', value: '2' },
  { label: 'March', value: '3' },
  { label: 'April', value: '4' },
  { label: 'May', value: '5' },
  { label: 'June', value: '6' },
  { label: 'July', value: '7' },
  { label: 'August', value: '8' },
  { label: 'September', value: '9' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
]

export const DAYS_OF_MONTH_OPTIONS = [
  ...Array.from({ length: 30 }, (_, i) => ({
    label: `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}`,
    value: `${i + 1}`,
  })),
  { label: '31st or Last day of month', value: 'last' },
]

// Type guard to access schedule data safely
interface ItemWithScheduleData {
  dayOfWeek?: string
  anchorDate?: string
  dayOfMonth?: string | number
  month?: string
}

// Helper to read schedule fields from the recurring item record
function getScheduleData(item: ItemWithScheduleData) {
  return item
}

export const SCHEDULES: Record<string, ScheduleDefinition> = {
  weekly: {
    type: 'weekly',
    name: 'Weekly',
    description: 'Occurs every week on a specific day',
    requiredFields: [
      {
        name: 'scheduleData',
        type: 'group',
        fields: [
          {
            name: 'dayOfWeek',
            type: 'select',
            required: true,
            options: DAYS_OF_WEEK_OPTIONS,
            admin: {
              description: 'Which day of the week does this occur?',
            },
          },
        ],
      },
    ],
    matchesPeriod: (itemData, periodStart, periodEnd) => {
      const data = itemData as ItemWithScheduleData
      const scheduleData = getScheduleData(data)
      const dayOfWeek = parseInt(scheduleData?.dayOfWeek || '0')

      // Check each day in the period to see if it matches the target day of week
      const current = new Date(periodStart)
      while (current <= periodEnd) {
        if (getDayOfWeek(current) === dayOfWeek) {
          return true
        }
        current.setDate(current.getDate() + 1)
      }
      return false
    },
  },

  biweekly: {
    type: 'biweekly',
    name: 'Bi-weekly',
    description: 'Occurs every two weeks on a specific day',
    requiredFields: [
      {
        name: 'scheduleData',
        type: 'group',
        fields: [
          {
            name: 'anchorDate',
            type: 'date',
            required: true,
            admin: {
              description:
                'When did/will this bi-weekly cycle start? (e.g., your first paycheck date)',
              date: {
                pickerAppearance: 'dayOnly',
              },
            },
          },
          {
            name: 'dayOfWeek',
            type: 'select',
            required: true,
            options: DAYS_OF_WEEK_OPTIONS,
            admin: {
              description: 'Which day of the week does this occur?',
            },
          },
        ],
      },
    ],
    matchesPeriod: (itemData, periodStart, periodEnd) => {
      const data = itemData as ItemWithScheduleData
      const scheduleData = getScheduleData(data)
      const anchorDate = new Date(scheduleData?.anchorDate || new Date())
      const dayOfWeek = parseInt(scheduleData?.dayOfWeek || '0')

      // Check each occurrence of the target day of week in the period
      const current = new Date(periodStart)
      while (current <= periodEnd) {
        if (getDayOfWeek(current) === dayOfWeek) {
          // Is this date a bi-weekly interval from the anchor?
          const weeksBetween = getWeeksBetween(anchorDate, current)
          if (weeksBetween % 2 === 0) {
            return true
          }
        }
        current.setDate(current.getDate() + 1)
      }
      return false
    },
  },

  monthly: {
    type: 'monthly',
    name: 'Monthly',
    description: 'Occurs every month on a specific day',
    requiredFields: [
      {
        name: 'scheduleData',
        type: 'group',
        fields: [
          {
            name: 'dayOfMonth',
            type: 'select',
            required: true,
            options: DAYS_OF_MONTH_OPTIONS,
            admin: {
              description: 'Which day of the month does this occur?',
            },
          },
        ],
      },
    ],
    matchesPeriod: (itemData, periodStart, periodEnd) => {
      const data = itemData as ItemWithScheduleData
      const scheduleData = getScheduleData(data)
      const dayOfMonth = scheduleData?.dayOfMonth

      // Check each month that overlaps with the period
      const current = new Date(periodStart)
      const monthsChecked = new Set<string>()

      while (current <= periodEnd) {
        const monthKey = `${current.getFullYear()}-${current.getMonth()}`

        if (!monthsChecked.has(monthKey)) {
          monthsChecked.add(monthKey)

          let targetDate: Date
          if (dayOfMonth === 'last') {
            targetDate = getLastDayOfMonth(current.getFullYear(), current.getMonth())
          } else {
            targetDate = new Date(
              current.getFullYear(),
              current.getMonth(),
              parseInt(String(dayOfMonth || '1')),
            )
          }

          if (isDateInRange(targetDate, periodStart, periodEnd)) {
            return true
          }
        }

        current.setDate(current.getDate() + 1)
      }
      return false
    },
  },

  bimonthly_1_15: {
    type: 'bimonthly_1_15',
    name: 'Bi-monthly (1st and 15th)',
    description: 'Occurs on the 1st and 15th of each month',
    requiredFields: [], // No additional fields needed
    matchesPeriod: (itemData, periodStart, periodEnd) => {
      // Check each month that overlaps with the period
      const current = new Date(periodStart)
      const monthsChecked = new Set<string>()

      while (current <= periodEnd) {
        const monthKey = `${current.getFullYear()}-${current.getMonth()}`

        if (!monthsChecked.has(monthKey)) {
          monthsChecked.add(monthKey)

          const first = new Date(current.getFullYear(), current.getMonth(), 1)
          const fifteenth = new Date(current.getFullYear(), current.getMonth(), 15)

          if (
            isDateInRange(first, periodStart, periodEnd) ||
            isDateInRange(fifteenth, periodStart, periodEnd)
          ) {
            return true
          }
        }

        current.setDate(current.getDate() + 1)
      }
      return false
    },
  },

  bimonthly_15_last: {
    type: 'bimonthly_15_last',
    name: 'Bi-monthly (15th and last day)',
    description: 'Occurs on the 15th and last day of each month',
    requiredFields: [], // No additional fields needed
    matchesPeriod: (itemData, periodStart, periodEnd) => {
      // Check each month that overlaps with the period
      const current = new Date(periodStart)
      const monthsChecked = new Set<string>()

      while (current <= periodEnd) {
        const monthKey = `${current.getFullYear()}-${current.getMonth()}`

        if (!monthsChecked.has(monthKey)) {
          monthsChecked.add(monthKey)

          const fifteenth = new Date(current.getFullYear(), current.getMonth(), 15)
          const lastDay = getLastDayOfMonth(current.getFullYear(), current.getMonth())

          if (
            isDateInRange(fifteenth, periodStart, periodEnd) ||
            isDateInRange(lastDay, periodStart, periodEnd)
          ) {
            return true
          }
        }

        current.setDate(current.getDate() + 1)
      }
      return false
    },
  },

  quarterly: {
    type: 'quarterly',
    name: 'Quarterly',
    description: 'Occurs every three months',
    requiredFields: [
      {
        name: 'scheduleData',
        type: 'group',
        fields: [
          {
            name: 'anchorDate',
            type: 'date',
            required: true,
            admin: {
              description: 'When did/will this first occur? (e.g., Jan 1, Apr 1, Jul 1, Oct 1)',
              date: {
                pickerAppearance: 'dayOnly',
              },
            },
          },
        ],
      },
    ],
    matchesPeriod: (itemData, periodStart, periodEnd) => {
      const data = itemData as ItemWithScheduleData
      const scheduleData = getScheduleData(data)
      const anchorDate = new Date(scheduleData?.anchorDate || new Date())

      // Check if any quarterly occurrence falls in the period
      const checkDate = new Date(anchorDate)

      // Go back far enough to catch any occurrence before periodStart
      while (checkDate > periodStart) {
        checkDate.setMonth(checkDate.getMonth() - 3)
      }

      // Now move forward checking each quarterly occurrence
      while (checkDate <= periodEnd) {
        if (isDateInRange(checkDate, periodStart, periodEnd)) {
          return true
        }
        checkDate.setMonth(checkDate.getMonth() + 3)
      }

      return false
    },
  },

  semiannually: {
    type: 'semiannually',
    name: 'Semi-annually',
    description: 'Occurs every six months',
    requiredFields: [
      {
        name: 'scheduleData',
        type: 'group',
        fields: [
          {
            name: 'anchorDate',
            type: 'date',
            required: true,
            admin: {
              description: 'When did/will this first occur?',
              date: {
                pickerAppearance: 'dayOnly',
              },
            },
          },
        ],
      },
    ],
    matchesPeriod: (itemData, periodStart, periodEnd) => {
      const data = itemData as ItemWithScheduleData
      const scheduleData = getScheduleData(data)
      const anchorDate = new Date(scheduleData?.anchorDate || new Date())

      // Check if any semi-annual occurrence falls in the period
      const checkDate = new Date(anchorDate)

      // Go back far enough to catch any occurrence before periodStart
      while (checkDate > periodStart) {
        checkDate.setMonth(checkDate.getMonth() - 6)
      }

      // Now move forward checking each semi-annual occurrence
      while (checkDate <= periodEnd) {
        if (isDateInRange(checkDate, periodStart, periodEnd)) {
          return true
        }
        checkDate.setMonth(checkDate.getMonth() + 6)
      }

      return false
    },
  },

  annually: {
    type: 'annually',
    name: 'Annually',
    description: 'Occurs once per year on a specific date',
    requiredFields: [
      {
        name: 'scheduleData',
        type: 'group',
        fields: [
          {
            name: 'month',
            type: 'select',
            required: true,
            options: MONTHS_OPTIONS,
            admin: {
              description: 'Which month does this occur?',
            },
          },
          {
            name: 'dayOfMonth',
            type: 'select',
            required: true,
            options: DAYS_OF_MONTH_OPTIONS,
            admin: {
              description: 'Which day of the month? (or last day)',
            },
          },
        ],
      },
    ],
    matchesPeriod: (itemData, periodStart, periodEnd) => {
      const data = itemData as ItemWithScheduleData
      const scheduleData = getScheduleData(data)
      const month = parseInt(scheduleData?.month || '1') - 1 // Convert to 0-indexed
      const dayOfMonth = scheduleData?.dayOfMonth

      // Check each year that might overlap with the period
      const startYear = periodStart.getFullYear()
      const endYear = periodEnd.getFullYear()

      for (let year = startYear; year <= endYear; year++) {
        let targetDate: Date
        if (dayOfMonth === 'last') {
          targetDate = getLastDayOfMonth(year, month)
        } else {
          targetDate = new Date(year, month, parseInt(String(dayOfMonth || '1')))
        }

        if (isDateInRange(targetDate, periodStart, periodEnd)) {
          return true
        }
      }

      return false
    },
  },
}

/**
 * Get a schedule definition by type
 */
export function getSchedule(type: string): ScheduleDefinition | undefined {
  return SCHEDULES[type]
}

/**
 * Get all available schedule types for use in select fields
 */
export function getScheduleOptions() {
  return Object.values(SCHEDULES).map((schedule) => ({
    label: schedule.name,
    value: schedule.type,
  }))
}

/**
 * Check if a schedule type requires additional detail fields
 */
export function scheduleRequiresDetails(scheduleType: string): boolean {
  const schedule = SCHEDULES[scheduleType]
  if (!schedule) return false

  // Check if the schedule has any fields in scheduleData group
  return schedule.requiredFields.some((field) => {
    if (field.type === 'group' && 'name' in field && field.name === 'scheduleData') {
      return field.fields && field.fields.length > 0
    }
    return false
  })
}

/**
 * Extract all unique schedule detail fields from registry definitions
 * Returns fields with conditions based on scheduleType
 */
export function getScheduleDetailFields(): Field[] {
  // Collect all unique fields from all schedule types
  const fieldMap = new Map<string, Field>()

  Object.values(SCHEDULES).forEach((schedule) => {
    schedule.requiredFields.forEach((field) => {
      if (field.type === 'group' && 'name' in field && field.name === 'scheduleData') {
        // Extract fields from the scheduleData group
        field.fields?.forEach((nestedField) => {
          if ('name' in nestedField) {
            const fieldName = nestedField.name
            if (!fieldMap.has(fieldName)) {
              // Keep the field as-is, including the 'required' property
              fieldMap.set(fieldName, nestedField as Field)
            }
          }
        })
      }
    })
  })

  // Now add conditions to each field based on which schedules use them
  const fields = Array.from(fieldMap.values()).map((field) => {
    const fieldName = 'name' in field ? field.name : ''
    const schedulesUsingField: string[] = []

    // Find which schedules use this field
    Object.values(SCHEDULES).forEach((schedule) => {
      schedule.requiredFields.forEach((reqField) => {
        if (reqField.type === 'group' && 'name' in reqField && reqField.name === 'scheduleData') {
          reqField.fields?.forEach((nestedField) => {
            if ('name' in nestedField && nestedField.name === fieldName) {
              schedulesUsingField.push(schedule.type)
            }
          })
        }
      })
    })

    // Add condition to show field only when relevant scheduleType is selected
    // The 'required' property is preserved, so Payload will validate it when visible
    return {
      ...field,
      admin: {
        ...(field.admin || {}),
        condition: (data: Record<string, unknown>) =>
          schedulesUsingField.includes(data.scheduleType as string),
      },
    } as Field
  })

  return fields
}
