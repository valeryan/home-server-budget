import type { CollectionConfig } from 'payload'
import { updateAccountBalance } from '@/payload/hooks/updateAccountBalance'

export const Transactions: CollectionConfig = {
  slug: 'transactions',
  admin: {
    useAsTitle: 'description',
    defaultColumns: ['displayTitle', 'date', 'type', 'amount', 'account', 'payee'],
    description: 'Record of all financial transactions',
    group: '💰 Budgeting',
  },
  access: {
    read: () => true,
    // Synced transactions may still be updated (category, notes, reconciled)
    // but the immutable ledger fields are protected in the beforeChange hook
    update: () => true,
    // Synced transactions cannot be deleted — only manual ones can
    delete: ({ data }) => {
      // data is the doc being deleted
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data as any)?.syncSource !== 'teller'
    },
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation }) => {
        // Protect immutable ledger fields on Teller-synced transactions
        if (operation === 'update' && originalDoc?.syncSource === 'teller') {
          data.date = originalDoc.date
          data.amount = originalDoc.amount
          data.description = originalDoc.description
          data.type = originalDoc.type
          data.syncSource = 'teller'
          data.tellerTransactionId = originalDoc.tellerTransactionId
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, req: { payload }, operation, previousDoc }) => {
        // Get account ID (handle both string and populated object)
        const accountId = typeof doc.account === 'string' ? doc.account : doc.account?.id
        const prevAccountId =
          typeof previousDoc?.account === 'string' ? previousDoc.account : previousDoc?.account?.id

        // Update the primary account
        if (accountId) {
          await updateAccountBalance(accountId, payload)
        }

        // If it's a transfer, update the destination account too
        if (doc.type === 'transfer' && doc.transferDetails?.toAccount) {
          const toAccountId =
            typeof doc.transferDetails.toAccount === 'string'
              ? doc.transferDetails.toAccount
              : doc.transferDetails.toAccount?.id
          if (toAccountId) {
            await updateAccountBalance(toAccountId, payload)
          }
        }

        // If updating and the account changed, recalculate the old account too
        if (operation === 'update' && prevAccountId && prevAccountId !== accountId) {
          await updateAccountBalance(prevAccountId, payload)
        }

        // If updating a transfer and the destination changed, recalculate old destination
        if (operation === 'update' && doc.type === 'transfer') {
          const prevToAccountId =
            typeof previousDoc?.transferDetails?.toAccount === 'string'
              ? previousDoc.transferDetails.toAccount
              : previousDoc.transferDetails?.toAccount?.id
          const toAccountId =
            typeof doc.transferDetails?.toAccount === 'string'
              ? doc.transferDetails.toAccount
              : doc.transferDetails.toAccount?.id

          if (prevToAccountId && prevToAccountId !== toAccountId) {
            await updateAccountBalance(prevToAccountId, payload)
          }
        }

        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req: { payload } }) => {
        // Get account ID (handle both string and populated object)
        const accountId = typeof doc.account === 'string' ? doc.account : doc.account?.id

        // Recalculate the primary account
        if (accountId) {
          await updateAccountBalance(accountId, payload)
        }

        // If it was a transfer, recalculate the destination account
        if (doc.type === 'transfer' && doc.transferDetails?.toAccount) {
          const toAccountId =
            typeof doc.transferDetails.toAccount === 'string'
              ? doc.transferDetails.toAccount
              : doc.transferDetails.toAccount?.id
          if (toAccountId) {
            await updateAccountBalance(toAccountId, payload)
          }
        }

        // Delete any associated budget-item records
        const budgetItems = await payload.find({
          collection: 'budget-items',
          where: {
            transaction: {
              equals: doc.id,
            },
          },
        })

        for (const budgetItem of budgetItems.docs) {
          await payload.delete({
            collection: 'budget-items',
            id: budgetItem.id,
          })
        }

        return doc
      },
    ],
  },
  fields: [
    // Sync source badge — shown in admin when this is a Teller-imported transaction
    {
      type: 'ui',
      name: 'syncedBadge',
      admin: {
        components: {
          Field: '@/payload/admin/cells/SyncedTransactionBadge#SyncedTransactionBadge',
        },
        condition: (data) => data?.syncSource === 'teller',
      },
    },
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
      name: 'displayTitle',
      type: 'text',
      admin: {
        description:
          'Human-readable name shown in lists (e.g. "Sam\'s Club"). Auto-populated from payee or AI suggestion.',
      },
    },
    {
      name: 'payee',
      type: 'relationship',
      relationTo: 'payees',
      admin: {
        description: 'The merchant or person this transaction is with',
      },
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      admin: {
        components: {
          Cell: '@/payload/admin/cells/CurrencyCell#CurrencyCell',
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
    // ── Teller sync metadata ──────────────────────────────────────────────
    {
      name: 'tellerTransactionId',
      type: 'text',
      index: true,
      admin: {
        description: 'Unique ID from Teller (used to prevent duplicate imports)',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'syncSource',
      type: 'select',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Teller', value: 'teller' },
      ],
      defaultValue: 'manual',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'matchConfidence',
      type: 'select',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Auto (rule)', value: 'auto_rule' },
        { label: 'Auto (AI)', value: 'auto_ai' },
        { label: 'Unmatched', value: 'unmatched' },
      ],
      defaultValue: 'manual',
      admin: {
        description: 'How this transaction was categorized/matched',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'matchedRecurringItem',
      type: 'relationship',
      relationTo: 'recurring-items',
      admin: {
        description: 'The recurring item this transaction was matched to (set during sync)',
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
}
