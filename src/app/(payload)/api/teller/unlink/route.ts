/**
 * POST /api/teller/unlink
 *
 * Clears all Teller fields on an account, reverting it to manual.
 *
 * Body: { accountId: string }
 */

import { getPayloadClient } from '@/payload/client'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayloadClient()
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as { accountId?: string }
    if (!body.accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    await payload.update({
      collection: 'accounts',
      id: body.accountId,
      data: {
        tellerAccessToken: null,
        tellerAccountId: null,
        tellerEnrollmentId: null,
        tellerInstitutionName: null,
        tellerLastSyncedAt: null,
        accountSource: 'manual',
      } as never,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unlink failed'
    console.error('[teller/unlink]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
