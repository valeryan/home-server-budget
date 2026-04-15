import { calculateBudgetProjection } from '@/domain/budgets/calculateProjection'
import { getPayloadClient } from '@/payload/client'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const accountId = searchParams.get('account')
  const budgetId = searchParams.get('budgetId')

  if (!startDate || !endDate || !accountId) {
    return NextResponse.json(
      { error: 'Missing required parameters: startDate, endDate, account' },
      { status: 400 },
    )
  }

  try {
    const payload = await getPayloadClient()
    const projection = await calculateBudgetProjection(payload, {
      startDate,
      endDate,
      accountId,
      budgetId,
    })

    return NextResponse.json(projection)
  } catch (error) {
    console.error('Error calculating budget projections:', error)
    return NextResponse.json({ error: 'Failed to calculate projections' }, { status: 500 })
  }
}
