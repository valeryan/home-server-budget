'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import React, { useState } from 'react'
import styles from './styles.module.scss'

// Shape returned by /api/teller/accounts
interface TellerAccount {
  id: string
  name: string
  last_four: string
  type: string
  subtype: string
  institution: { name: string; id: string }
  enrollment_id: string
}

// The Teller Connect onSuccess payload (no accounts — must fetch separately)
interface TellerEnrollment {
  accessToken: string
  user: { id: string }
  enrollment: {
    id: string
    institution: { name: string; id: string }
  }
}

declare global {
  interface Window {
    TellerConnect: {
      setup: (config: Record<string, unknown>) => { open: () => void }
    }
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const el = document.createElement('script')
    el.src = src
    el.onload = () => resolve()
    el.onerror = reject
    document.head.appendChild(el)
  })
}

function formatDate(iso: string | undefined | null): string {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export const TellerConnectButton: React.FC = () => {
  const { id: accountId } = useDocumentInfo()

  // Read live form field values so the UI reflects the saved state
  // FormFieldsContext is [FormState, Dispatch] — selector receives the tuple
  const tellerAccountId = useFormFields(
    ([fields]) => fields.tellerAccountId?.value as string | undefined,
  )
  const tellerInstitutionName = useFormFields(
    ([fields]) => fields.tellerInstitutionName?.value as string | undefined,
  )
  const tellerLastSyncedAt = useFormFields(
    ([fields]) => fields.tellerLastSyncedAt?.value as string | undefined,
  )

  const isConnected = Boolean(tellerAccountId)

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  // enrollment holds the raw Teller callback result
  const [enrollment, setEnrollment] = useState<TellerEnrollment | null>(null)
  // accounts are fetched from the server after enrollment
  const [accounts, setAccounts] = useState<TellerAccount[]>([])
  const [selectedTellerId, setSelectedTellerId] = useState<string>('')

  // ── Sync ─────────────────────────────────────────────────────────────────
  async function handleSync() {
    if (!accountId) return
    setStatus('loading')
    setMessage(null)
    try {
      const res = await fetch('/api/teller/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        created?: number
        skipped?: number
        matched?: number
      }
      if (!res.ok) throw new Error(data.error ?? 'Sync failed')
      setStatus('success')
      setMessage(
        `Synced — ${data.created ?? 0} new transaction${data.created === 1 ? '' : 's'}, ${data.matched ?? 0} matched`,
      )
      setTimeout(() => window.location.reload(), 2000)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Sync failed')
    }
  }

  // ── Unlink ────────────────────────────────────────────────────────────────
  async function handleUnlink() {
    if (!accountId) return
    if (
      !window.confirm(
        'Unlink this account from Teller? Existing synced transactions will remain but no new ones will be imported.',
      )
    )
      return
    setStatus('loading')
    setMessage(null)
    try {
      const res = await fetch('/api/teller/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? 'Unlink failed')
      }
      setStatus('success')
      setMessage('Unlinked. Reloading…')
      setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Unlink failed')
    }
  }

  // ── Connect flow ──────────────────────────────────────────────────────────
  async function openTellerConnect() {
    setStatus('loading')
    setMessage(null)
    try {
      await loadScript('https://cdn.teller.io/connect/connect.js')
      const appId = process.env.NEXT_PUBLIC_TELLER_APP_ID ?? ''
      const environment = (process.env.NEXT_PUBLIC_TELLER_ENV ?? 'development') as string
      const instance = window.TellerConnect.setup({
        applicationId: appId,
        environment,
        onSuccess: (data: TellerEnrollment) => {
          // Teller Connect callback does NOT include accounts — fetch them separately
          setEnrollment(data)
          setStatus('loading')
          void fetchTellerAccounts(data.accessToken, data.enrollment.institution.name)
        },
        onExit: () => setStatus('idle'),
        onFailure: () => {
          setStatus('error')
          setMessage('Teller Connect failed. Check your application ID and environment setting.')
        },
      })
      instance.open()
    } catch {
      setStatus('error')
      setMessage('Could not load Teller Connect. Check your internet connection.')
    }
  }

  async function fetchTellerAccounts(accessToken: string, institutionName: string) {
    try {
      const res = await fetch('/api/teller/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? 'Failed to load accounts')
      }
      const data = (await res.json()) as { accounts: TellerAccount[] }
      const fetched = data.accounts ?? []
      setAccounts(fetched)
      if (fetched.length === 1) setSelectedTellerId(fetched[0].id)
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setMessage(
        `Connected to ${institutionName} but could not load accounts: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }
  }

  async function handleLink() {
    if (!enrollment || !selectedTellerId) return
    setStatus('loading')
    setMessage(null)
    try {
      const selectedAccount = accounts.find((a) => a.id === selectedTellerId)
      const res = await fetch('/api/teller/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: enrollment.accessToken,
          enrollmentId: enrollment.enrollment.id,
          institutionName: enrollment.enrollment.institution.name,
          payloadAccountId: accountId ?? null,
          tellerAccountId: selectedTellerId,
          tellerAccountName: selectedAccount?.name,
          tellerAccountType: selectedAccount?.type,
          tellerAccountSubtype: selectedAccount?.subtype,
          tellerLastFour: selectedAccount?.last_four,
        }),
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? 'Link failed')
      }
      const result = (await res.json()) as { created?: boolean; payloadAccountId?: string }
      setEnrollment(null)
      setAccounts([])
      setStatus('success')
      if (result.created) {
        setMessage(`Account created and connected! Go to Accounts to see it.`)
      } else {
        setMessage(`Connected! Reloading…`)
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Link failed')
    }
  }

  // ── Render: connected state ───────────────────────────────────────────────
  if (isConnected) {
    return (
      <div className={styles.connectedPanel}>
        <div className={styles.connectedHeader}>
          <span className={styles.connectedBadge}>● Connected</span>
          <span className={styles.connectedInstitution}>
            {tellerInstitutionName ?? 'Bank account linked'}
          </span>
        </div>
        <p className={styles.connectedMeta}>Last synced: {formatDate(tellerLastSyncedAt)}</p>
        {message && <p className={status === 'error' ? styles.error : styles.banner}>{message}</p>}
        <div className={styles.actions}>
          <button
            className={styles.btn}
            disabled={status === 'loading'}
            type="button"
            onClick={handleSync}
          >
            {status === 'loading' ? 'Syncing…' : 'Sync Now'}
          </button>
          <button
            className={styles.btnDanger}
            disabled={status === 'loading'}
            type="button"
            onClick={handleUnlink}
          >
            Unlink
          </button>
        </div>
      </div>
    )
  }

  // ── Render: account picker (after enrollment) ─────────────────────────────
  if (status === 'success' && message) {
    return <div className={styles.banner}>{message}</div>
  }

  if (enrollment && accounts.length > 0) {
    return (
      <div className={styles.panel}>
        <p className={styles.panelTitle}>
          Connected to <strong>{enrollment.enrollment.institution.name}</strong>
        </p>
        <p className={styles.panelSub}>
          {accountId
            ? 'Select the bank account to link to this Payload account:'
            : 'Select the bank account to import:'}
        </p>
        <div className={styles.accountList}>
          {accounts.map((a) => (
            <label key={a.id} className={styles.accountRow}>
              <input
                type="radio"
                name="tellerAccount"
                value={a.id}
                checked={selectedTellerId === a.id}
                onChange={() => setSelectedTellerId(a.id)}
              />
              <span className={styles.accountName}>{a.name}</span>
              <span className={styles.accountMeta}>
                {a.subtype} ···{a.last_four}
              </span>
            </label>
          ))}
        </div>
        {message && <p className={styles.error}>{message}</p>}
        <div className={styles.actions}>
          <button
            className={styles.btn}
            disabled={!selectedTellerId || status === 'loading'}
            type="button"
            onClick={handleLink}
          >
            {status === 'loading' ? 'Linking…' : accountId ? 'Link account' : 'Create & connect'}
          </button>
          <button
            className={styles.btnSecondary}
            disabled={status === 'loading'}
            type="button"
            onClick={() => {
              setEnrollment(null)
              setAccounts([])
              setStatus('idle')
              setMessage(null)
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (enrollment && status === 'loading') {
    return (
      <div className={styles.panel}>
        <p className={styles.panelTitle}>
          Connected to <strong>{enrollment.enrollment.institution.name}</strong>
        </p>
        <p className={styles.panelSub}>Loading accounts…</p>
      </div>
    )
  }

  // ── Render: not connected ─────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      <p className={styles.label}>Bank Connection</p>
      {message && <p className={styles.error}>{message}</p>}
      <button
        className={styles.btn}
        disabled={status === 'loading'}
        type="button"
        onClick={openTellerConnect}
      >
        {status === 'loading'
          ? 'Loading…'
          : accountId
            ? 'Connect to Teller'
            : 'Connect New Bank Account'}
      </button>
      <p className={styles.hint}>
        Connecting links this account to your bank so transactions sync automatically. You can still
        add or delete manual transactions on a connected account.
      </p>
    </div>
  )
}
