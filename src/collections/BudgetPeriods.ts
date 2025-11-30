import type { CollectionConfig } from 'payload'
import { enforceOneActiveBudgetPerAccount } from '../hooks/budgetPeriodHooks'

export const Budgets: CollectionConfig = {
  slug: 'budgets',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'account', 'startDate', 'endDate', 'status'],
    description:
      '📅 Step 4: Create budget periods - containers for a slice of time (e.g., paycheck to paycheck)',
    group: '💰 Budget Periods',
  },
  access: {
    read: () => true,
  },
  hooks: {
    beforeChange: [enforceOneActiveBudgetPerAccount],
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
          Field: '/components/BudgetProjections#BudgetProjections',
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
