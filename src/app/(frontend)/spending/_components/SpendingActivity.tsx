'use client'

import { formatCurrency, formatDate } from '@/shared/formatting'
import { Modal } from '@/shared/ui/Modal'
import type {
  FrontendPlannedItem,
  FrontendTransactionRow,
} from '@/app/(frontend)/_lib/dashboard'
import { TransactionInsightDrawer } from '@/app/(frontend)/spending/_components/TransactionInsightDrawer'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import styles from '../../_components/styles.module.scss'

export type ActivityRow =
  | { kind: 'transaction'; item: FrontendTransactionRow }
  | { kind: 'pending'; item: FrontendPlannedItem }

interface SpendingActivityProps {
  rows: ActivityRow[]
  openingBalance?: number | null
  budgetId?: string | null
}

function toDateLabel(isoStr: string): string {
  const d = new Date(isoStr)
  // Compare UTC calendar dates to avoid timezone shifts on UTC-midnight stored dates
  const now = new Date()
  const todayMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const dMidnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const yesterdayMidnight = todayMidnight - 86400000
  if (dMidnight === todayMidnight) return 'Today'
  if (dMidnight === yesterdayMidnight) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function SpendingActivity({ rows, openingBalance, budgetId }: SpendingActivityProps) {
  const router = useRouter()
  const [activeItem, setActiveItem] = useState<FrontendPlannedItem | null>(null)
  const [activeTransaction, setActiveTransaction] = useState<FrontendTransactionRow | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const aDate =
        a.kind === 'transaction' ? a.item.date : (a.item.dueDate ?? new Date().toISOString())
      const bDate =
        b.kind === 'transaction' ? b.item.date : (b.item.dueDate ?? new Date().toISOString())
      const diff = new Date(aDate).getTime() - new Date(bDate).getTime()
      return sortAsc ? diff : -diff
    })
    return copy
  }, [rows, sortAsc])

  type Group = { label: string; rows: ActivityRow[] }
  const groups: Group[] = []
  for (const row of sorted) {
    const isoStr =
      row.kind === 'transaction' ? row.item.date : (row.item.dueDate ?? new Date().toISOString())
    const label = toDateLabel(isoStr)
    if (groups.length === 0 || groups[groups.length - 1].label !== label) {
      groups.push({ label, rows: [row] })
    } else {
      groups[groups.length - 1].rows.push(row)
    }
  }

  const hasOpeningBalance = openingBalance != null

  return (
    <>
      <div className="sp-activity">
        <div className="sp-activity-head">
          <span>Description</span>
          <span>Category</span>
          <button className="sp-sort-btn" type="button" onClick={() => setSortAsc((s) => !s)}>
            Date {sortAsc ? '↑' : '↓'}
          </button>
          <span>Amount</span>
        </div>

        {!hasOpeningBalance && groups.length === 0 && (
          <div className="sp-empty">No transactions to show for this period.</div>
        )}

        {/* Opening balance row — always anchors the start of the ledger */}
        {hasOpeningBalance && sortAsc && (
          <div className="sp-row sp-row-balance">
            <div>
              <span className="sp-row-desc">Opening Balance</span>
              <span className="sp-row-sub">Carried forward from previous period</span>
            </div>
            <span className="sp-row-category">—</span>
            <span className="sp-row-date">Period start</span>
            <div className="sp-row-amount">
              <strong>{formatCurrency(openingBalance!)}</strong>
            </div>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.label}>
            <div className="sp-date-label">{group.label}</div>
            {group.rows.map((row) => {
              if (row.kind === 'transaction') {
                const t = row.item
                return (
                  <div
                    key={t.id}
                    className="sp-row sp-row-clickable"
                    onClick={() => setActiveTransaction(t)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setActiveTransaction(t)}
                  >
                    <div>
                      <span className="sp-row-desc">{t.displayTitle || t.description}</span>
                      {t.displayTitle && t.displayTitle !== t.description && (
                        <span className="sp-row-sub">{t.description}</span>
                      )}
                      {!t.displayTitle && (t.payeeName || t.otherAccountName) && (
                        <span className="sp-row-sub">{t.payeeName || t.otherAccountName}</span>
                      )}
                    </div>
                    <span className="sp-row-category">{t.categoryName || '—'}</span>
                    <span className="sp-row-date">{formatDate(t.date)}</span>
                    <div className="sp-row-amount">
                      <strong className={t.signedAmount < 0 ? 'is-negative' : 'is-positive'}>
                        {t.signedAmount < 0 ? '-' : '+'}
                        {formatCurrency(Math.abs(t.signedAmount))}
                      </strong>
                    </div>
                  </div>
                )
              }

              const p = row.item
              return (
                <div key={`pending-${p.id}`} className="sp-row sp-row-pending">
                  <div>
                    <span className="sp-row-desc">{p.name}</span>
                    <span className="sp-row-sub">
                      Recurring · {p.categoryName || p.payeeName || p.otherAccountName || p.kind}
                    </span>
                  </div>
                  <span className="sp-row-category">{p.categoryName || p.kind}</span>
                  <div className="sp-row-date">
                    <span className="sp-pending-badge">Pending</span>
                  </div>
                  <div className="sp-row-amount">
                    <strong className={p.direction === 'out' ? 'is-negative' : 'is-positive'}>
                      {p.direction === 'out' ? '-' : '+'}
                      {formatCurrency(p.amount)}
                    </strong>
                    {budgetId && (
                      <button
                        className="sp-record-btn"
                        type="button"
                        onClick={() => {
                          setError(null)
                          setActiveItem(p)
                        }}
                      >
                        Record
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        {/* Opening balance at the bottom when sort is descending */}
        {hasOpeningBalance && !sortAsc && (
          <div className="sp-row sp-row-balance">
            <div>
              <span className="sp-row-desc">Opening Balance</span>
              <span className="sp-row-sub">Carried forward from previous period</span>
            </div>
            <span className="sp-row-category">—</span>
            <span className="sp-row-date">Period start</span>
            <div className="sp-row-amount">
              <strong>{formatCurrency(openingBalance!)}</strong>
            </div>
          </div>
        )}
      </div>

      {activeItem && budgetId && (
        <Modal
          title={`Record ${activeItem.name}`}
          onClose={() => !submitting && setActiveItem(null)}
          size="md"
        >
          <form
            className={styles.dialogGrid}
            onSubmit={async (e) => {
              e.preventDefault()
              setSubmitting(true)
              setError(null)
              const fd = new FormData(e.currentTarget)
              try {
                const res = await fetch('/api/frontend/budget-items/actualize', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    budgetId,
                    recurringItemId: activeItem.id,
                    date: String(fd.get('date') || ''),
                    amount: Number(fd.get('amount') || activeItem.amount),
                    notes: String(fd.get('notes') || ''),
                  }),
                })
                if (!res.ok) {
                  const payload = await res.json()
                  throw new Error(payload.error || 'Failed to record item')
                }
                setActiveItem(null)
                router.refresh()
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to record item')
              } finally {
                setSubmitting(false)
              }
            }}
          >
            <label className={styles.field}>
              <span className={styles.label}>Date</span>
              <input
                className={styles.input}
                defaultValue={
                  activeItem.dueDate
                    ? activeItem.dueDate.split('T')[0]
                    : new Date().toISOString().split('T')[0]
                }
                name="date"
                required
                type="date"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Actual Amount</span>
              <input
                className={styles.input}
                defaultValue={activeItem.amount}
                min="0"
                name="amount"
                required
                step="0.01"
                type="number"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Notes</span>
              <textarea className={styles.textarea} name="notes" />
            </label>
            {error && <div className={styles.helper}>{error}</div>}
            <div className={styles.actions}>
              <button className={styles.button} disabled={submitting} type="submit">
                {submitting ? 'Recording...' : 'Create Transaction'}
              </button>
              <button
                className={styles.buttonSecondary}
                disabled={submitting}
                type="button"
                onClick={() => setActiveItem(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {activeTransaction && (
        <TransactionInsightDrawer
          transaction={activeTransaction}
          onClose={() => setActiveTransaction(null)}
          onSaved={() => {
            setActiveTransaction(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
