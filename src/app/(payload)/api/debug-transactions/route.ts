import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

export async function GET() {
  try {
    const payload = await getPayload({ config })

    const transactions = await payload.find({
      collection: 'transactions',
      limit: 100,
      sort: '-date',
    })

    return NextResponse.json({
      count: transactions.docs.length,
      transactions: transactions.docs.map((t) => ({
        id: t.id,
        date: t.date,
        type: t.type,
        amount: t.amount,
        description: t.description,
        account: typeof t.account === 'string' ? t.account : t.account?.id,
      })),
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}
