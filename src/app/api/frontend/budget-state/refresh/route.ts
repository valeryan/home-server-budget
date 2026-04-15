import { refreshBudgetState } from '@/app/api/frontend/_server/mutations'
import { getPayloadClient } from '@/payload/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const payload = await getPayloadClient()
    const result = await refreshBudgetState(payload, body.accountId)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to refresh budget state'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
