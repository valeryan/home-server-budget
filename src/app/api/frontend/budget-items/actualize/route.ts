import { actualizeBudgetItem } from '@/app/api/frontend/_server/mutations'
import { getPayloadClient } from '@/payload/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const input = await request.json()
    const payload = await getPayloadClient()
    const result = await actualizeBudgetItem(payload, input)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to actualize budget item'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
