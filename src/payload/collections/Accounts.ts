import {
  getScheduleDetailFields,
  getScheduleOptions,
  scheduleRequiresDetails,
} from '@/domain/schedules'
import type { CollectionConfig } from 'payload'

export const Accounts: CollectionConfig = {
  slug: 'accounts',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'accountType', 'currentBalance'],
    description: 'Bank accounts, credit cards, and cash accounts',
    group: '⚙️ System',
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
      name: 'accountSource',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Connected (Teller)', value: 'teller' },
      ],
      admin: {
        description:
          'Manual accounts are managed entirely in this app. Connected accounts sync transactions from your bank via Teller.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Show this account by default on the frontend dashboard',
        position: 'sidebar',
      },
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
          Cell: '@/payload/admin/cells/CurrencyCell#CurrencyCell',
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
        readOnly: true,
        components: {
          Cell: '@/payload/admin/cells/CurrencyCell#CurrencyCell',
        },
      },
    },
    {
      type: 'ui',
      name: 'recalculateBalance',
      admin: {
        components: {
          Field: '@/payload/admin/actions/RecalculateBalanceButton#RecalculateBalanceButton',
        },
        position: 'sidebar',
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
              Field: '@/payload/admin/fields/FieldsetLabel#CompoundingScheduleLabel',
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
              Field: '@/payload/admin/fields/FieldsetLabel#ScheduleDetailsLabel',
            },
            condition: (data) => !!data.scheduleType && scheduleRequiresDetails(data.scheduleType),
          },
        },
        ...getScheduleDetailFields(),
      ],
    },
    // ── Teller bank sync ──────────────────────────────────────────────────
    {
      type: 'ui',
      name: 'tellerConnect',
      admin: {
        components: {
          Field: '@/payload/admin/actions/TellerConnectButton#TellerConnectButton',
        },
      },
    },
    {
      name: 'tellerAccountId',
      type: 'text',
      admin: {
        description: 'Teller account ID (set automatically during Teller Connect)',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'tellerEnrollmentId',
      type: 'text',
      admin: {
        description: 'Teller enrollment ID (set automatically)',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'tellerInstitutionName',
      type: 'text',
      admin: {
        description: 'Bank/institution name from Teller',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'tellerAccessToken',
      type: 'text',
      admin: {
        description: 'Teller access token (set during Teller Connect)',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'tellerLastSyncedAt',
      type: 'date',
      admin: {
        description: 'When transactions were last pulled from Teller',
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
}
