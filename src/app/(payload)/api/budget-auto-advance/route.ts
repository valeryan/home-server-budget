import { autoAdvanceBudgets } from '@/lib/budgetScheduleUtils'
import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('account')

    if (!accountId) {
      return NextResponse.json({ error: 'Missing account parameter' }, { status: 400 })
    }

    const result = await autoAdvanceBudgets(payload, accountId)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error auto-advancing budgets:', error)
    return NextResponse.json(
      { error: 'Failed to auto-advance budgets', details: String(error) },
      { status: 500 },
    )
  }
}
