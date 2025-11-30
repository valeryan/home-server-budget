import type { CollectionConfig } from 'payload'

export const Transactions: CollectionConfig = {
  slug: 'transactions',
  admin: {
    useAsTitle: 'description',
    defaultColumns: ['date', 'type', 'amount', 'account'],
    description: 'Record of all financial transactions',
    group: '💰 Budgeting',
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
      name: 'account',
      type: 'relationship',
      relationTo: 'accounts',
      required: true,
      admin: {
        description: 'Which account this transaction affects',
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
      admin: {
        components: {
          Cell: '/components/CurrencyCell#CurrencyCell',
        },
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
          name: 'toAccount',
          type: 'relationship',
          relationTo: 'accounts',
          admin: {
            description: 'The account receiving the transfer',
          },
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
