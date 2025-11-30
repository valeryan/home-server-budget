import type { CollectionConfig } from 'payload'

export const Budgets: CollectionConfig = {
  slug: 'budgets',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'startDate', 'endDate', 'status'],
    description: 'Create a new budget for each paycheck cycle. Set up Templates first!',
    group: '💰 Budgets',
  },
  access: {
    read: () => true,
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
      name: 'startDate',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
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
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Completed', value: 'completed' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    {
      name: 'income',
      type: 'array',
      label: 'Income Items',
      admin: {
        description: 'Income for this budget period',
      },
      fields: [
        {
          name: 'recurringItem',
          type: 'relationship',
          relationTo: 'recurring-items',
          admin: {
            description: 'The recurring item this was created from (if any)',
          },
        },
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'amount',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'actualAmount',
          type: 'number',
          admin: {
            description: 'Actual amount received (if different from planned)',
          },
        },
        {
          name: 'category',
          type: 'relationship',
          relationTo: 'income-categories',
          required: true,
        },
        {
          name: 'payee',
          type: 'relationship',
          relationTo: 'payees',
          required: true,
        },
        {
          name: 'account',
          type: 'relationship',
          relationTo: 'accounts',
          required: true,
        },
        {
          name: 'date',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'received',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'notes',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'expenses',
      type: 'array',
      label: 'Expense Items',
      admin: {
        description: 'Expenses for this budget period',
      },
      fields: [
        {
          name: 'recurringItem',
          type: 'relationship',
          relationTo: 'recurring-items',
          admin: {
            description: 'The recurring item this was created from (if any)',
          },
        },
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'amount',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'actualAmount',
          type: 'number',
          admin: {
            description: 'Actual amount paid (if different from planned)',
          },
        },
        {
          name: 'category',
          type: 'relationship',
          relationTo: 'expense-categories',
          required: true,
        },
        {
          name: 'payee',
          type: 'relationship',
          relationTo: 'payees',
          required: true,
        },
        {
          name: 'account',
          type: 'relationship',
          relationTo: 'accounts',
          required: true,
        },
        {
          name: 'dueDate',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayOnly',
            },
          },
        },
        {
          name: 'paid',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'notes',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'transfers',
      type: 'array',
      label: 'Transfer Items',
      admin: {
        description: 'Transfers between accounts for this budget period',
      },
      fields: [
        {
          name: 'recurringItem',
          type: 'relationship',
          relationTo: 'recurring-items',
          admin: {
            description: 'The recurring item this was created from (if any)',
          },
        },
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'amount',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'fromAccount',
          type: 'relationship',
          relationTo: 'accounts',
          required: true,
        },
        {
          name: 'toAccount',
          type: 'relationship',
          relationTo: 'accounts',
          required: true,
        },
        {
          name: 'date',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'completed',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'notes',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'summary',
      type: 'group',
      admin: {
        description: 'Calculated totals (can be computed on save or via hook)',
      },
      fields: [
        {
          name: 'totalIncome',
          type: 'number',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'totalExpenses',
          type: 'number',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'netIncome',
          type: 'number',
          admin: {
            readOnly: true,
            description: 'Total Income - Total Expenses',
          },
        },
      ],
    },
    {
      name: 'notes',
      type: 'richText',
    },
  ],
}
