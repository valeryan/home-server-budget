/**
 * POST /api/teller/accounts
 *
 * Fetches the list of accounts for a given Teller access token using mTLS.
 * Called from the TellerConnectButton component after a successful enrollment.
 *
 * Body: { accessToken: string }
 * Returns: { accounts: TellerAccount[] }
 */

import { tellerGet } from '@/integrations/teller/client'
import { getPayloadClient } from '@/payload/client'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export interface TellerAccountResponse {
  id: string
  name: string
  last_four: string
  type: string
  subtype: string
  status: string
  institution: { name: string; id: string }
  enrollment_id: string
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayloadClient()
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as { accessToken?: string }
    if (!body.accessToken) {
      return NextResponse.json({ error: 'accessToken is required' }, { status: 400 })
    }

    const accounts = await tellerGet<TellerAccountResponse[]>(
      'https://api.teller.io/accounts',
      body.accessToken,
    )

    return NextResponse.json({ accounts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch accounts'
    console.error('[teller/accounts]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
