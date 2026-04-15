import type { CollectionConfig } from 'payload'
import { enforceOneActiveBudgetPerAccount } from '@/payload/hooks/budgetPeriodHooks'

/** Normalize a Payload date value (ISO string or Date) to UTC midnight date string */
function toUtcMidnight(value: unknown): string | undefined {
  if (!value) return undefined
  const d = new Date(String(value))
  if (isNaN(d.getTime())) return undefined
  // Extract the calendar date in UTC and rebuild as UTC midnight
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}T00:00:00.000Z`
}

export const Budgets: CollectionConfig = {
  slug: 'budgets',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'account', 'startDate', 'endDate', 'status'],
    description: 'Time-based budget periods (paycheck to paycheck)',
    group: '💰 Budgeting',
  },
  access: {
    read: () => true,
  },
  hooks: {
    beforeChange: [
      enforceOneActiveBudgetPerAccount,
      // Normalize dates to UTC midnight so browser-timezone offsets don't shift them
      ({ data }) => {
        if (data.startDate) data.startDate = toUtcMidnight(data.startDate)
        if (data.endDate) data.endDate = toUtcMidnight(data.endDate)
        return data
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'E.g., "December 15th Paycheck" or "Budget 2024-01-15"',
      },
    },
    {
      name: 'account',
      type: 'relationship',
      relationTo: 'accounts',
      required: true,
      admin: {
        description: 'The account this budget period manages',
      },
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
        description: 'Start of this budget period',
      },
    },
    {
      name: 'endDate',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
        description: 'End of this budget period',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'planning',
      options: [
        { label: 'Planning', value: 'planning' },
        { label: 'Active', value: 'active' },
        { label: 'Closed', value: 'closed' },
      ],
      admin: {
        description: 'Planning = setting up, Active = current period, Closed = completed/archived',
      },
    },

    {
      type: 'ui',
      name: 'budgetProjections',
      admin: {
        components: {
          Field: '@/payload/admin/dashboard/BudgetProjections#BudgetProjections',
        },
        position: 'sidebar',
      },
    },

    {
      name: 'notes',
      type: 'richText',
      admin: {
        description: 'Notes about this budget period (goals, special circumstances, etc.)',
      },
    },
  ],
}
