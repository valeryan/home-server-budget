import config from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId parameter' }, { status: 400 })
    }

    const payload = await getPayload({ config })

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

    console.log(`Recalculating balance for account ${accountId}`)
    console.log(`Starting balance: ${balance}`)
    console.log(`Total transactions: ${transactions.docs.length}`)

    // Calculate balance from all transactions
    for (const transaction of transactions.docs) {
      const amount = transaction.amount
      const transactionAccountId =
        typeof transaction.account === 'string' ? transaction.account : transaction.account?.id

      if (transactionAccountId === accountId) {
        // This account is the primary account
        if (transaction.type === 'income') {
          balance += amount
          console.log(
            `  ${transaction.date} - Income: +${amount} (${transaction.description}) = ${balance}`,
          )
        } else if (transaction.type === 'expense') {
          balance -= amount
          console.log(
            `  ${transaction.date} - Expense: -${amount} (${transaction.description}) = ${balance}`,
          )
        } else if (transaction.type === 'transfer') {
          // Transferring out reduces balance
          balance -= amount
          console.log(
            `  ${transaction.date} - Transfer Out: -${amount} (${transaction.description}) = ${balance}`,
          )
        }
      } else if (transaction.type === 'transfer' && transaction.transferDetails?.toAccount) {
        // Check if this account is receiving the transfer
        const toAccountId =
          typeof transaction.transferDetails.toAccount === 'string'
            ? transaction.transferDetails.toAccount
            : transaction.transferDetails.toAccount?.id

        if (toAccountId === accountId) {
          balance += amount
          console.log(
            `  ${transaction.date} - Transfer In: +${amount} (${transaction.description}) = ${balance}`,
          )
        }
      }
    }

    console.log(`Final calculated balance: ${balance}`)

    // Update the account's current balance
    await payload.update({
      collection: 'accounts',
      id: accountId,
      data: {
        currentBalance: balance,
      },
    })

    return NextResponse.json({
      success: true,
      accountId,
      oldBalance: account.currentBalance,
      newBalance: balance,
      transactionCount: transactions.docs.length,
    })
  } catch (error) {
    console.error('Error recalculating balance:', error)
    return NextResponse.json({ error: 'Failed to recalculate balance' }, { status: 500 })
  }
}
