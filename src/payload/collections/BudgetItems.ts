import type { CollectionConfig } from 'payload'

export const BudgetItems: CollectionConfig = {
  slug: 'budget-items',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['budget', 'recurringItem', 'dueDate', 'isActualized'],
    description: 'Tracks recurring items within budget periods and their actualization status',
    group: '💰 Budgeting',
    hidden: true, // Hidden from main nav since these are managed through budgets
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'budget',
      type: 'relationship',
      relationTo: 'budgets',
      required: true,
      admin: {
        description: 'The budget period this item belongs to',
      },
    },
    {
      name: 'recurringItem',
      type: 'relationship',
      relationTo: 'recurring-items',
      required: true,
      admin: {
        description: 'The recurring item this budget item is based on',
      },
    },
    {
      name: 'dueDate',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
        description: 'When this item is due/expected within the budget period',
      },
    },
    {
      name: 'isActualized',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Has this budget item been recorded as a transaction?',
      },
    },
    {
      name: 'transaction',
      type: 'relationship',
      relationTo: 'transactions',
      admin: {
        description: 'The transaction that actualized this budget item',
        condition: (data) => data?.isActualized === true,
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Optional notes about this budget item',
      },
    },
  ],
}
