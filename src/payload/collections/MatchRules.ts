import type { CollectionConfig } from 'payload'

/**
 * Match rules define how incoming synced transactions get auto-categorized
 * and optionally linked to a recurring item.
 *
 * Evaluation order:
 *   1. descriptionPattern (substring or regex) must match the raw transaction description
 *   2. amountMin / amountMax narrow the match when the amount varies
 *   3. If a recurringItemId is set, matching auto-claims the pending budget item
 *   4. If a category is set, it is applied to the transaction
 */
export const MatchRules: CollectionConfig = {
  slug: 'match-rules',
  admin: {
    useAsTitle: 'name',
    description: 'Auto-categorization and recurring item matching rules for synced transactions',
    group: '⚙️ System',
    defaultColumns: ['name', 'descriptionPattern', 'transactionType', 'recurringItem'],
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
        description: 'Human-readable label, e.g. "Netflix subscription"',
      },
    },
    {
      name: 'descriptionPattern',
      type: 'text',
      required: true,
      admin: {
        description:
          'Substring or /regex/ to match against the raw transaction description (case-insensitive)',
        placeholder: 'e.g. NETFLIX or /walmart.*/i',
      },
    },
    {
      name: 'transactionType',
      type: 'select',
      options: [
        { label: 'Any', value: 'any' },
        { label: 'Income', value: 'income' },
        { label: 'Expense', value: 'expense' },
        { label: 'Transfer', value: 'transfer' },
      ],
      defaultValue: 'any',
      admin: {
        description: 'Optionally restrict to a specific transaction type',
      },
    },
    {
      name: 'amountMin',
      type: 'number',
      min: 0,
      admin: {
        description: 'Minimum amount (inclusive). Leave blank for no lower bound.',
      },
    },
    {
      name: 'amountMax',
      type: 'number',
      min: 0,
      admin: {
        description: 'Maximum amount (inclusive). Leave blank for no upper bound.',
      },
    },
    {
      name: 'recurringItem',
      type: 'relationship',
      relationTo: 'recurring-items',
      admin: {
        description:
          'When this rule matches, link the transaction to this recurring item and auto-record its budget item',
      },
    },
    {
      name: 'payee',
      type: 'relationship',
      relationTo: 'payees',
      admin: {
        description: 'Payee to assign to matching transactions',
      },
    },
    {
      name: 'expenseCategory',
      type: 'relationship',
      relationTo: 'expense-categories',
      admin: {
        description: 'Expense category to assign when this rule matches',
        condition: (data) => !data?.incomeCategory,
      },
    },
    {
      name: 'incomeCategory',
      type: 'relationship',
      relationTo: 'income-categories',
      admin: {
        description: 'Income category to assign when this rule matches',
        condition: (data) => !data?.expenseCategory,
      },
    },
    {
      name: 'priority',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Higher number = evaluated first. Useful when multiple rules could match.',
        position: 'sidebar',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Disabled rules are ignored during matching',
        position: 'sidebar',
      },
    },
  ],
}
