import type { CollectionConfig } from 'payload'
import {
  getScheduleDetailFields,
  getScheduleOptions,
  scheduleRequiresDetails,
} from '../lib/schedules'

export const RecurringItems: CollectionConfig = {
  slug: 'recurring-items',
  admin: {
    useAsTitle: 'name',
    description: 'Recurring income, expenses, and transfers',
    group: '⚙️ System',

    defaultColumns: ['name', 'itemType', 'category', 'amount', 'account', 'scheduleType'],
    listSearchableFields: ['name'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'category',
      type: 'text',
      admin: {
        hidden: true,
        components: {
          Cell: '/components/RecurringItemCategoryCell#RecurringItemCategoryCell',
        },
      },
    },
    {
      name: 'itemType',
      type: 'select',
      required: true,
      options: [
        { label: '💰 Income', value: 'income' },
        { label: '💳 Expense', value: 'expense' },
        { label: '↔️ Transfer', value: 'transfer' },
      ],
      admin: {
        description: 'What type of recurring item is this?',
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
      admin: {
        components: {
          Cell: '/components/CurrencyCell#CurrencyCell',
        },
      },
    },
    // Income-specific fields
    {
      name: 'incomeCategory',
      type: 'relationship',
      relationTo: 'income-categories',
      admin: {
        description: 'Income category',
        condition: (data) => data.itemType === 'income',
      },
    },
    // Expense-specific fields
    {
      name: 'expenseCategory',
      type: 'relationship',
      relationTo: 'expense-categories',
      admin: {
        description: 'Expense category',
        condition: (data) => data.itemType === 'expense',
      },
    },
    // Income & Expense common field
    {
      name: 'payee',
      type: 'relationship',
      relationTo: 'payees',
      admin: {
        description: 'Who you pay (expense) or who pays you (income)',
        condition: (data) => data.itemType === 'income' || data.itemType === 'expense',
      },
    },
    // Income & Expense: single account
    {
      name: 'account',
      type: 'relationship',
      relationTo: 'accounts',
      admin: {
        description: 'Account this income is deposited to or expense is paid from',
        condition: (data) => data.itemType === 'income' || data.itemType === 'expense',
      },
    },
    // Transfer-specific fields
    {
      name: 'fromAccount',
      type: 'relationship',
      relationTo: 'accounts',
      admin: {
        description: 'Account to transfer from',
        condition: (data) => data.itemType === 'transfer',
      },
    },
    {
      name: 'toAccount',
      type: 'relationship',
      relationTo: 'accounts',
      admin: {
        description: 'Account to transfer to',
        condition: (data) => data.itemType === 'transfer',
      },
    },
    // Expense-specific: balance tracking
    {
      name: 'hasBalance',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Does this expense have a balance to track (e.g., credit card, loan)?',
        condition: (data) => data.itemType === 'expense',
      },
    },
    {
      name: 'balance',
      type: 'group',
      admin: {
        condition: (data, siblingData) =>
          siblingData?.itemType === 'expense' && siblingData?.hasBalance,
      },
      fields: [
        {
          name: 'currentBalance',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'interestRate',
          type: 'number',
          admin: {
            description: 'Annual interest rate (e.g., 18.5 for 18.5%)',
          },
        },
      ],
    },
    // Schedule - grouped visually with border
    {
      type: 'group',
      admin: {
        style: {
          borderTop: '1px solid var(--theme-elevation-150)',
          borderBottom: '1px solid var(--theme-elevation-150)',
          paddingTop: '1.5rem',
          paddingBottom: '1.5rem',
          marginTop: '1.5rem',
          marginBottom: '1.5rem',
        },
      },
      fields: [
        {
          type: 'ui',
          name: 'recurringScheduleLabel',
          admin: {
            components: {
              Field: '/components/FieldsetLabel#RecurringScheduleLabel',
            },
          },
        },
        {
          name: 'scheduleType',
          type: 'select',
          required: true,
          options: getScheduleOptions(),
          admin: {
            description: 'How often this occurs',
          },
        },
        {
          type: 'ui',
          name: 'scheduleDetailsLabel',
          admin: {
            components: {
              Field: '/components/FieldsetLabel#ScheduleDetailsLabel',
            },
            condition: (data) => !!data.scheduleType && scheduleRequiresDetails(data.scheduleType),
          },
        },
        ...getScheduleDetailFields(),
      ],
    },
    // Universal fields
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Inactive items will not be included in new budget periods',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
}
