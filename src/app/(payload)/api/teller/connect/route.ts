/**
 * POST /api/teller/connect
 *
 * Called after Teller Connect completes in the browser.
 *
 * Two modes:
 *   1. Link existing: payloadAccountId provided → update that account with Teller token
 *   2. Create new:    payloadAccountId omitted   → create a new Payload account from Teller data
 *
 * Body: {
 *   accessToken: string         — from Teller Connect enrollment
 *   enrollmentId: string        — Teller enrollment ID
 *   institutionName: string     — bank name (e.g. "Redstone Federal Credit Union")
 *   tellerAccountId: string     — the specific Teller account ID to link
 *   tellerAccountName?: string  — account name from Teller (used when creating)
 *   tellerAccountType?: string  — "depository", "credit", etc.
 *   tellerAccountSubtype?: string — "checking", "savings", "heloc", etc.
 *   tellerLastFour?: string     — last 4 digits
 *   payloadAccountId?: string   — if provided, link to this existing account; otherwise create new
 * }
 */

import { getPayloadClient } from '@/payload/client'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Map Teller account subtypes to Payload accountType options
function mapAccountType(type?: string, subtype?: string): string {
  const sub = (subtype || '').toLowerCase()
  const t = (type || '').toLowerCase()
  if (sub === 'checking') return 'checking'
  if (sub === 'savings') return 'savings'
  if (sub === 'heloc' || sub === 'line_of_credit') return 'credit_card'
  if (t === 'credit') return 'credit_card'
  return 'other'
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayloadClient()

    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as {
      accessToken?: string
      enrollmentId?: string
      institutionName?: string
      tellerAccountId?: string
      tellerAccountName?: string
      tellerAccountType?: string
      tellerAccountSubtype?: string
      tellerLastFour?: string
      payloadAccountId?: string | null
    }

    const {
      accessToken,
      enrollmentId,
      institutionName,
      tellerAccountId,
      tellerAccountName,
      tellerAccountType,
      tellerAccountSubtype,
      tellerLastFour,
      payloadAccountId,
    } = body

    if (!accessToken || !tellerAccountId) {
      return NextResponse.json(
        { error: 'accessToken and tellerAccountId are required' },
        { status: 400 },
      )
    }

    const tellerData = {
      tellerAccessToken: accessToken,
      tellerAccountId,
      tellerEnrollmentId: enrollmentId ?? null,
      tellerInstitutionName: institutionName ?? null,
      // accountSource shadow field
      accountSource: 'teller',
    }

    // ── Mode 1: link to existing Payload account ──────────────────────────
    if (payloadAccountId) {
      const account = await payload.findByID({ collection: 'accounts', id: payloadAccountId })
      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }
      await payload.update({
        collection: 'accounts',
        id: payloadAccountId,
        data: tellerData as never,
      })
      return NextResponse.json({ ok: true, created: false, payloadAccountId })
    }

    // ── Mode 2: create new Payload account from Teller data ───────────────
    const accountName = tellerAccountName
      ? `${institutionName ? `${institutionName} — ` : ''}${tellerAccountName}${tellerLastFour ? ` (···${tellerLastFour})` : ''}`
      : `${institutionName ?? 'Bank'} Account ${tellerLastFour ? `···${tellerLastFour}` : ''}`

    const newAccount = await payload.create({
      collection: 'accounts',
      data: {
        name: accountName,
        accountType: mapAccountType(tellerAccountType, tellerAccountSubtype),
        startingBalance: 0,
        currentBalance: 0,
        ...tellerData,
      } as never,
    })

    return NextResponse.json({ ok: true, created: true, payloadAccountId: newAccount.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connect failed'
    console.error('[teller/connect]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
