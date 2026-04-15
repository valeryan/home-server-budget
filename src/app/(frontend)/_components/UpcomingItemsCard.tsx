'use client'

import { formatCurrency, formatDate } from '@/shared/formatting'
import { Modal } from '@/shared/ui/Modal'
import type { FrontendPlannedItem } from '@/app/(frontend)/_lib/dashboard'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from './styles.module.scss'

interface UpcomingItemsCardProps {
  budgetId?: string | null
  items: FrontendPlannedItem[]
}

export function UpcomingItemsCard({ budgetId, items }: UpcomingItemsCardProps) {
  const router = useRouter()
  const [activeItem, setActiveItem] = useState<FrontendPlannedItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const incomeItems = items.filter((item) => item.kind === 'income')
  const expenseItems = items.filter((item) => item.kind === 'expense' || item.kind === 'transfer')

  function renderItem(item: FrontendPlannedItem) {
    return (
      <article key={`${item.kind}-${item.id}`} className={styles.listItem}>
        <div className={styles.itemTop}>
          <div>
            <h3 className={styles.itemName}>{item.name}</h3>
            <div className={styles.itemMeta}>
              {item.dueDate ? formatDate(item.dueDate) : 'No due date'}
              {item.categoryName ? ` · ${item.categoryName}` : ''}
              {item.payeeName ? ` · ${item.payeeName}` : ''}
              {item.otherAccountName ? ` · ${item.otherAccountName}` : ''}
            </div>
          </div>
          <strong className={item.direction === 'out' ? styles.negative : styles.positive}>
            {item.direction === 'out' ? '-' : '+'}
            {formatCurrency(item.amount)}
          </strong>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.buttonSecondary}
            disabled={!budgetId}
            type="button"
            onClick={() => {
              setError(null)
              setActiveItem(item)
            }}
          >
            Record Now
          </button>
        </div>
      </article>
    )
  }

  return (
    <>
      <div className={styles.list}>
        {items.length === 0 ? (
          <div className={styles.empty}>Nothing left to record in this period.</div>
        ) : (
          <>
            {incomeItems.length > 0 && (
              <div className={styles.section}>
                <p className={styles.sectionLabel}>Income</p>
                {incomeItems.map(renderItem)}
              </div>
            )}
            {expenseItems.length > 0 && (
              <div className={styles.section}>
                <p className={styles.sectionLabel}>Expenses</p>
                {expenseItems.map(renderItem)}
              </div>
            )}
          </>
        )}
      </div>

      {activeItem && budgetId ? (
        <Modal
          title={`Record ${activeItem.name}`}
          onClose={() => !submitting && setActiveItem(null)}
          size="md"
        >
          <form
            className={styles.dialogGrid}
            onSubmit={async (event) => {
              event.preventDefault()
              setSubmitting(true)
              setError(null)
              const formData = new FormData(event.currentTarget)

              try {
                const response = await fetch('/api/frontend/budget-items/actualize', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    budgetId,
                    recurringItemId: activeItem.id,
                    date: String(formData.get('date') || ''),
                    amount: Number(formData.get('amount') || activeItem.amount),
                    notes: String(formData.get('notes') || ''),
                  }),
                })

                if (!response.ok) {
                  const payload = await response.json()
                  throw new Error(payload.error || 'Failed to record item')
                }

                setActiveItem(null)
                router.refresh()
              } catch (submitError) {
                setError(
                  submitError instanceof Error ? submitError.message : 'Failed to record item',
                )
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

            {error ? <div className={styles.helper}>{error}</div> : null}

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
      ) : null}
    </>
  )
}
