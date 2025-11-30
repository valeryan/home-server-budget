import {
  getScheduleDetailFields,
  getScheduleOptions,
  scheduleRequiresDetails,
} from '@/lib/schedules'
import type { CollectionConfig } from 'payload'

export const Accounts: CollectionConfig = {
  slug: 'accounts',
  admin: {
    useAsTitle: 'name',
    description: '📋 Step 2: Add your bank accounts (checking, savings, credit cards)',
    group: '⚙️ Setup',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'accountType',
      type: 'select',
      required: true,
      options: [
        { label: 'Checking', value: 'checking' },
        { label: 'Savings', value: 'savings' },
        { label: 'Credit Card', value: 'credit_card' },
        { label: 'Cash', value: 'cash' },
        { label: 'Investment', value: 'investment' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'startingBalance',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: {
        description: 'The initial balance of this account',
        components: {
          Cell: '/components/CurrencyCell#CurrencyCell',
        },
      },
    },
    {
      name: 'currentBalance',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: {
        description: 'The current balance (updated automatically by transactions)',
        components: {
          Cell: '/components/CurrencyCell#CurrencyCell',
        },
      },
    },
    {
      name: 'hasInterestRate',
      type: 'checkbox',
      defaultValue: false,
      label: 'This account earns/charges interest',
    },
    {
      name: 'interestRate',
      type: 'number',
      admin: {
        condition: (data) => data.hasInterestRate,
        description: 'Annual interest rate (e.g., 5.5 for 5.5%)',
      },
    },
    {
      type: 'group',
      admin: {
        condition: (data) => data.hasInterestRate,
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
          name: 'compoundingScheduleLabel',
          admin: {
            components: {
              Field: '/components/FieldsetLabel#CompoundingScheduleLabel',
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
  ],
}
