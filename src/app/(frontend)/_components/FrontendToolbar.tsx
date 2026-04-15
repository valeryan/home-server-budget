'use client'

import { Modal } from '@/shared/ui/Modal'
import type {
  FrontendAccountOption,
  FrontendBudgetOption,
  FrontendTransactionOption,
} from '@/app/(frontend)/_lib/dashboard'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import styles from './styles.module.scss'

interface FrontendToolbarProps {
  accounts: FrontendAccountOption[]
  budgets: FrontendBudgetOption[]
  selectedAccountId?: string | null
  selectedBudgetId?: string | null
  transactionOptions: {
    incomeCategories: FrontendTransactionOption[]
    expenseCategories: FrontendTransactionOption[]
    payees: FrontendTransactionOption[]
    accounts: FrontendAccountOption[]
  }
}

export function FrontendToolbar({
  accounts,
  budgets,
  selectedAccountId,
  selectedBudgetId,
  transactionOptions,
}: FrontendToolbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [isRefreshingBudget, setIsRefreshingBudget] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | 'transfer'>(
    'expense',
  )
  const [categoryId, setCategoryId] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [payeeId, setPayeeId] = useState('')
  const [payeeName, setPayeeName] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId)
  const categoryOptions =
    transactionType === 'income'
      ? transactionOptions.incomeCategories
      : transactionType === 'expense'
        ? transactionOptions.expenseCategories
        : []

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })

    startTransition(() => {
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname)
    })
  }

  const handleRefreshBudget = async () => {
    if (!selectedAccountId) return
    setIsRefreshingBudget(true)

    try {
      const response = await fetch('/api/frontend/budget-state/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId }),
      })

      if (!response.ok) {
        throw new Error('Failed to refresh budget state')
      }

      router.refresh()
    } catch (refreshError) {
      const message =
        refreshError instanceof Error ? refreshError.message : 'Failed to refresh budget state'
      setError(message)
    } finally {
      setIsRefreshingBudget(false)
    }
  }

  const resetComposer = () => {
    setTransactionType('expense')
    setCategoryId('')
    setCategoryName('')
    setPayeeId('')
    setPayeeName('')
    setToAccountId('')
    setError(null)
  }

  return (
    <div className={styles.toolbar}>
      <nav className={styles.nav} aria-label="Sections">
        <Link
          className={`${styles.navLink} ${pathname === '/' ? styles.navLinkActive : ''}`}
          href={
            selectedAccountId
              ? `/?account=${selectedAccountId}${selectedBudgetId ? `&budget=${selectedBudgetId}` : ''}`
              : '/'
          }
        >
          Overview
        </Link>
        <Link
          className={`${styles.navLink} ${pathname === '/spending' ? styles.navLinkActive : ''}`}
          href={
            selectedAccountId
              ? `/spending?account=${selectedAccountId}${selectedBudgetId ? `&budget=${selectedBudgetId}` : ''}`
              : '/spending'
          }
        >
          Spending
        </Link>
      </nav>

      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.label}>Account</span>
          <select
            className={styles.select}
            value={selectedAccountId || ''}
            disabled={isPending}
            onChange={(event) =>
              updateFilters({ account: event.target.value || null, budget: null })
            }
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Budget Period</span>
          <select
            className={styles.select}
            value={selectedBudgetId || ''}
            disabled={isPending || budgets.length === 0}
            onChange={(event) => updateFilters({ budget: event.target.value || null })}
          >
            {budgets.length === 0 ? <option value="">No budget periods</option> : null}
            {budgets.map((budget) => (
              <option key={budget.id} value={budget.id}>
                {budget.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.actions}>
        <button className={styles.button} type="button" onClick={() => setShowComposer(true)}>
          Add Transaction
        </button>
        <button
          className={styles.buttonSecondary}
          type="button"
          onClick={handleRefreshBudget}
          disabled={!selectedAccountId || isRefreshingBudget}
        >
          {isRefreshingBudget ? 'Refreshing...' : 'Refresh Budget State'}
        </button>
        <Link className={styles.buttonGhost} href="/admin">
          Open Admin
        </Link>
      </div>

      {selectedAccount ? (
        <div className={styles.meta}>
          Working in {selectedAccount.name}. Transactions entered here still flow through the
          existing Payload collections and hooks.
        </div>
      ) : null}

      {showComposer ? (
        <Modal
          title="Add Transaction"
          onClose={() => {
            if (submitting) return
            setShowComposer(false)
            resetComposer()
          }}
          size="lg"
        >
          <form
            className={styles.dialogGrid}
            onSubmit={async (event) => {
              event.preventDefault()
              if (!selectedAccountId) return

              setSubmitting(true)
              setError(null)

              const formData = new FormData(event.currentTarget)

              try {
                const response = await fetch('/api/frontend/transactions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    accountId: selectedAccountId,
                    type: transactionType,
                    date: String(formData.get('date') || ''),
                    amount: Number(formData.get('amount') || 0),
                    description: String(formData.get('description') || ''),
                    notes: String(formData.get('notes') || ''),
                    categoryId: categoryId || null,
                    categoryName: categoryName || null,
                    payeeId: payeeId || null,
                    payeeName: payeeName || null,
                    toAccountId: transactionType === 'transfer' ? toAccountId || null : null,
                  }),
                })

                if (!response.ok) {
                  const payload = await response.json()
                  throw new Error(payload.error || 'Failed to create transaction')
                }

                setShowComposer(false)
                resetComposer()
                router.refresh()
              } catch (submitError) {
                setError(
                  submitError instanceof Error
                    ? submitError.message
                    : 'Failed to create transaction',
                )
              } finally {
                setSubmitting(false)
              }
            }}
          >
            <div className={styles.twoCol}>
              <label className={styles.field}>
                <span className={styles.label}>Date</span>
                <input
                  className={styles.input}
                  defaultValue={new Date().toISOString().split('T')[0]}
                  name="date"
                  type="date"
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Type</span>
                <select
                  className={styles.select}
                  value={transactionType}
                  onChange={(event) => {
                    setTransactionType(event.target.value as 'income' | 'expense' | 'transfer')
                    setCategoryId('')
                    setCategoryName('')
                    setPayeeId('')
                    setPayeeName('')
                    setToAccountId('')
                  }}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="transfer">Transfer</option>
                </select>
              </label>
            </div>

            <div className={styles.twoCol}>
              <label className={styles.field}>
                <span className={styles.label}>Description</span>
                <input className={styles.input} name="description" required type="text" />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Amount</span>
                <input
                  className={styles.input}
                  min="0"
                  name="amount"
                  required
                  step="0.01"
                  type="number"
                />
              </label>
            </div>

            {transactionType !== 'transfer' ? (
              <>
                <div className={styles.twoCol}>
                  <label className={styles.field}>
                    <span className={styles.label}>Existing Category</span>
                    <select
                      className={styles.select}
                      value={categoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                    >
                      <option value="">Select a category</option>
                      {categoryOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>New Category</span>
                    <input
                      className={styles.input}
                      type="text"
                      value={categoryName}
                      onChange={(event) => setCategoryName(event.target.value)}
                    />
                  </label>
                </div>

                <div className={styles.twoCol}>
                  <label className={styles.field}>
                    <span className={styles.label}>Existing Payee</span>
                    <select
                      className={styles.select}
                      value={payeeId}
                      onChange={(event) => setPayeeId(event.target.value)}
                    >
                      <option value="">Select a payee</option>
                      {transactionOptions.payees.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>New Payee</span>
                    <input
                      className={styles.input}
                      type="text"
                      value={payeeName}
                      onChange={(event) => setPayeeName(event.target.value)}
                    />
                  </label>
                </div>
              </>
            ) : (
              <label className={styles.field}>
                <span className={styles.label}>Destination Account</span>
                <select
                  className={styles.select}
                  value={toAccountId}
                  onChange={(event) => setToAccountId(event.target.value)}
                >
                  <option value="">Select destination</option>
                  {transactionOptions.accounts
                    .filter((account) => account.id !== selectedAccountId)
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                </select>
              </label>
            )}

            <label className={styles.field}>
              <span className={styles.label}>Notes</span>
              <textarea className={styles.textarea} name="notes" />
            </label>

            {error ? <div className={styles.helper}>{error}</div> : null}

            <div className={styles.actions}>
              <button className={styles.button} disabled={submitting} type="submit">
                {submitting ? 'Saving...' : 'Save Transaction'}
              </button>
              <button
                className={styles.buttonSecondary}
                disabled={submitting}
                type="button"
                onClick={() => {
                  setShowComposer(false)
                  resetComposer()
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  )
}
