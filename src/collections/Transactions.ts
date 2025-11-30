import type { CollectionConfig } from 'payload'

export const Transactions: CollectionConfig = {
  slug: 'transactions',
  admin: {
    useAsTitle: 'description',
    defaultColumns: ['date', 'type', 'amount', 'account', 'budget'],
    description: 'Historical record of all financial transactions (optional)',
    group: '💰 Budgets',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'date',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Income', value: 'income' },
        { label: 'Expense', value: 'expense' },
        { label: 'Transfer', value: 'transfer' },
      ],
    },
    {
      name: 'description',
      type: 'text',
      required: true,
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
    },
    {
      name: 'budget',
      type: 'relationship',
      relationTo: 'budgets',
      required: true,
      admin: {
        description: 'Which budget this transaction belongs to',
      },
    },
    // Fields for income transactions
    {
      name: 'incomeDetails',
      type: 'group',
      admin: {
        condition: (data) => data?.type === 'income',
      },
      fields: [
        {
          name: 'category',
          type: 'relationship',
          relationTo: 'income-categories',
        },
        {
          name: 'payee',
          type: 'relationship',
          relationTo: 'payees',
        },
        {
          name: 'account',
          type: 'relationship',
          relationTo: 'accounts',
        },
      ],
    },
    // Fields for expense transactions
    {
      name: 'expenseDetails',
      type: 'group',
      admin: {
        condition: (data) => data?.type === 'expense',
      },
      fields: [
        {
          name: 'category',
          type: 'relationship',
          relationTo: 'expense-categories',
        },
        {
          name: 'payee',
          type: 'relationship',
          relationTo: 'payees',
        },
        {
          name: 'account',
          type: 'relationship',
          relationTo: 'accounts',
        },
      ],
    },
    // Fields for transfer transactions
    {
      name: 'transferDetails',
      type: 'group',
      admin: {
        condition: (data) => data?.type === 'transfer',
      },
      fields: [
        {
          name: 'fromAccount',
          type: 'relationship',
          relationTo: 'accounts',
        },
        {
          name: 'toAccount',
          type: 'relationship',
          relationTo: 'accounts',
        },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
    },
    {
      name: 'reconciled',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Has this transaction been reconciled with your bank statement?',
      },
    },
  ],
}
