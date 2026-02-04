import type { PayloadRequest } from 'payload'

export async function updateAccountBalance(accountId: string, payload: PayloadRequest['payload']) {
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
