import { getPayloadClient } from '@/payload/client'
import { createFrontendTransaction } from '@/app/api/frontend/_server/mutations'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const input = await request.json()
    const payload = await getPayloadClient()
    const transaction = await createFrontendTransaction(payload, input)

    return NextResponse.json({ doc: transaction }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create transaction'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
