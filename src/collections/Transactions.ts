import type { CollectionConfig, PayloadRequest } from 'payload'

async function updateAccountBalance(accountId: string, payload: PayloadRequest['payload']) {
  // Get all transactions for this account, sorted by date
  const transactions = await payload.find({
    collection: 'transactions',
    where: {
      or: [
        { account: { equals: accountId } },
        { 'transferDetails.toAccount': { equals: accountId } },
      ],
    },
    sort: 'date',
    limit: 10000,
  })

  // Get the account's starting balance
  const account = await payload.findByID({
    collection: 'accounts',
    id: accountId,
  })

  let balance = account.startingBalance

  // Calculate balance from all transactions
  for (const transaction of transactions.docs) {
    const amount = transaction.amount
    const transactionAccountId =
      typeof transaction.account === 'string' ? transaction.account : transaction.account?.id

    if (transactionAccountId === accountId) {
      // This account is the primary account
      if (transaction.type === 'income') {
        balance += amount
      } else if (transaction.type === 'expense') {
        balance -= amount
      } else if (transaction.type === 'transfer') {
        // Transferring out reduces balance
        balance -= amount
      }
    } else if (transaction.type === 'transfer' && transaction.transferDetails?.toAccount) {
      // Check if this account is receiving the transfer
      const toAccountId =
        typeof transaction.transferDetails.toAccount === 'string'
          ? transaction.transferDetails.toAccount
          : transaction.transferDetails.toAccount?.id

      if (toAccountId === accountId) {
        balance += amount
      }
    }
  }

  // Update the account's current balance
  await payload.update({
    collection: 'accounts',
    id: accountId,
    data: {
      currentBalance: balance,
    },
  })
}

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
  hooks: {
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
