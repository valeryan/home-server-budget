import type { CollectionConfig } from 'payload'
import {
  getScheduleDetailFields,
  getScheduleOptions,
  scheduleRequiresDetails,
} from '../lib/schedules'

export const BudgetSchedules: CollectionConfig = {
  slug: 'budget-schedules',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'account', 'scheduleType', 'isActive'],
    description: 'Automated budget period creation and management',
    group: '💰 Budgeting',
  },
  labels: {
    singular: 'Budget Automation',
    plural: 'Budget Automations',
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
        description: 'A name for this budget schedule',
      },
    },
    {
      name: 'account',
      type: 'relationship',
      relationTo: 'accounts',
      required: true,
      admin: {
        description: 'Which account to create budgets for',
      },
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
          name: 'budgetScheduleLabel',
          admin: {
            components: {
              Field: '/components/FieldsetLabel#BudgetScheduleLabel',
            },
          },
        },
        {
          name: 'scheduleType',
          type: 'select',
          required: true,
          options: getScheduleOptions(),
          defaultValue: 'biweekly',
          admin: {
            description: 'How often to create new budget periods',
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
    {
      name: 'budgetNamePattern',
      type: 'text',
      defaultValue: 'Budget {start} - {end}',
      admin: {
        description: 'Template for budget names. Use {start} and {end} for dates.',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Enable automatic budget creation for this schedule',
      },
    },
    {
      name: 'lookAhead',
      type: 'number',
      defaultValue: 1,
      min: 0,
      max: 5,
      admin: {
        description: 'How many future "planned" budgets to maintain',
      },
    },
  ],
}
