'use client'

import type { MatchRule } from '@/domain/matching/applyRules'
import { formatCurrency, formatDate } from '@/shared/formatting'
import { Modal } from '@/shared/ui/Modal'
import type { FrontendTransactionRow } from '@/app/(frontend)/_lib/dashboard'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from '../../../_components/styles.module.scss'
import drawerStyles from './styles.module.scss'

interface Payee {
  id: string
  name: string
}
interface Category {
  id: string
  name: string
}
interface RecurringItem {
  id: string
  name: string
  amount: number
}

interface InsightDoc {
  id: string
  status: 'pending' | 'accepted' | 'rejected'
  suggestedPayee: string | null
  suggestedPayeeLink: Payee | null
  suggestedExpenseCategory: Category | null
  suggestedIncomeCategory: Category | null
  suggestedRecurringItems: (RecurringItem | string)[] | null
  acceptedPayee: Payee | null
  acceptedExpenseCategory: Category | null
  acceptedIncomeCategory: Category | null
  acceptedRecurringItem: RecurringItem | null
  ollamaConfidence: 'high' | 'medium' | 'low' | null
}

interface TransactionDoc {
  type: 'income' | 'expense' | 'transfer'
  payee: Payee | null
  expenseDetails?: { payee?: Payee | null; category?: Category | null }
  incomeDetails?: { payee?: Payee | null; category?: Category | null }
  matchedRecurringItem?: RecurringItem | null
}

interface TransactionInsightDrawerProps {
  transaction: FrontendTransactionRow
  onClose: () => void
  onSaved: () => void
}

function resolveCategory(rel: Category | string | null | undefined): Category | null {
  if (!rel) return null
  if (typeof rel === 'string') return null
  return rel
}

export function TransactionInsightDrawer({
  transaction,
  onClose,
  onSaved,
}: TransactionInsightDrawerProps) {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matchingCount, setMatchingCount] = useState<number | null>(null)

  const [insightDoc, setInsightDoc] = useState<InsightDoc | null>(null)
  const [matchedRule, setMatchedRule] = useState<MatchRule | null>(null)

  // Form state
  const [payeeText, setPayeeText] = useState('')
  const [payeeOpen, setPayeeOpen] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [recurringItemId, setRecurringItemId] = useState('')
  const payeeInputRef = useRef<HTMLInputElement>(null)
  const payeeListRef = useRef<HTMLUListElement>(null)

  // Options
  const [payees, setPayees] = useState<Payee[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([])

  // Derived — must be after payees state
  const filteredPayees = payees.filter(
    (p) => payeeText.trim() === '' || p.name.toLowerCase().includes(payeeText.toLowerCase()),
  )

  const loadData = useCallback(
    async (skipAI = true) => {
      setLoading(true)
      setError(null)
      try {
        const [insightRes, optRes] = await Promise.all([
          fetch('/api/frontend/transaction-insight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId: transaction.id, skipAI }),
          }),
          fetch(`/api/payees?limit=200&sort=name`),
        ])

        const insightData = await insightRes.json()
        const optData = await optRes.json()

        setInsightDoc(insightData.insight)
        setMatchedRule(insightData.matchedRule ?? null)
        setPayees(optData.docs || [])

        // Load categories based on transaction type
        const catCollection =
          transaction.type === 'income' ? 'income-categories' : 'expense-categories'
        const catRes = await fetch(`/api/${catCollection}?limit=200&sort=name`)
        const catData = await catRes.json()
        setCategories(catData.docs || [])

        // Load recurring items
        const riRes = await fetch(
          `/api/recurring-items?limit=200&sort=name&where[itemType][equals]=${transaction.type}`,
        )
        const riData = await riRes.json()
        setRecurringItems(riData.docs || [])

        // Pre-fill form from transaction doc
        const tx = insightData.transaction as TransactionDoc | null
        if (tx) {
          const txPayee =
            tx.payee ??
            (tx.type === 'expense' ? tx.expenseDetails?.payee : tx.incomeDetails?.payee) ??
            null
          setPayeeText(txPayee?.name || '')
          const txCat =
            tx.type === 'expense'
              ? resolveCategory(tx.expenseDetails?.category)
              : tx.type === 'income'
                ? resolveCategory(tx.incomeDetails?.category)
                : null
          setCategoryId(txCat?.id || '')
          setRecurringItemId(
            typeof tx.matchedRecurringItem === 'object' && tx.matchedRecurringItem
              ? tx.matchedRecurringItem.id
              : typeof tx.matchedRecurringItem === 'string'
                ? tx.matchedRecurringItem
                : '',
          )
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    },
    [transaction.id, transaction.type],
  )

  useEffect(() => {
    loadData(true)
    // Count other transactions that share the same raw description and type
    const desc = encodeURIComponent(transaction.description)
    const type = encodeURIComponent(transaction.type)
    fetch(
      `/api/transactions?where[description][equals]=${desc}&where[type][equals]=${type}&limit=0`,
    )
      .then((r) => r.json())
      .then((d) => setMatchingCount(d.totalDocs ?? null))
      .catch(() => {
        /* non-critical */
      })
  }, [loadData, transaction.description, transaction.type])

  const analyze = async () => {
    setAnalyzing(true)
    setError(null)
    try {
      const res = await fetch('/api/frontend/transaction-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: transaction.id, skipAI: false, forceRefresh: true }),
      })
      const data = await res.json()
      setInsightDoc(data.insight)
    } catch {
      setError('AI analysis failed. Is Ollama running?')
    } finally {
      setAnalyzing(false)
    }
  }

  const save = async (createRule: boolean) => {
    setSaving(true)
    setError(null)
    try {
      const matchedPayee = payees.find(
        (p) => p.name.toLowerCase() === payeeText.trim().toLowerCase(),
      )
      const derivedDisplayTitle = payeeText.trim() || transaction.description
      const body: Record<string, unknown> = {
        transactionId: transaction.id,
        insightId: insightDoc?.id,
        displayTitle: derivedDisplayTitle,
        payeeId: matchedPayee?.id || null,
        payeeName: !matchedPayee && payeeText.trim() ? payeeText.trim() : undefined,
        recurringItemId: recurringItemId || null,
        createRule,
      }

      if (transaction.type === 'expense') body.expenseCategoryId = categoryId || null
      else if (transaction.type === 'income') body.incomeCategoryId = categoryId || null

      const res = await fetch('/api/frontend/transaction-insight', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Save failed')
      }

      onSaved()
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // Resolved suggestion values — prefer accepted over suggested
  const suggestedPayeeObj = insightDoc?.acceptedPayee ?? insightDoc?.suggestedPayeeLink
  const suggestedPayeeName = suggestedPayeeObj?.name ?? insightDoc?.suggestedPayee ?? null
  const suggestedCat = insightDoc
    ? (insightDoc.acceptedExpenseCategory ??
      insightDoc.acceptedIncomeCategory ??
      insightDoc.suggestedExpenseCategory ??
      insightDoc.suggestedIncomeCategory)
    : null
  const suggestedCandidates =
    insightDoc?.suggestedRecurringItems?.filter(
      (r): r is RecurringItem => typeof r === 'object' && r !== null && 'id' in r,
    ) ?? []

  const isTransfer = transaction.type === 'transfer'

  return (
    <Modal title={transaction.displayTitle || transaction.description} onClose={onClose} size="lg">
      <div className={drawerStyles.root}>
        {/* Transaction header */}
        <div className={drawerStyles.header}>
          <div className={drawerStyles.headerMeta}>
            <span className={drawerStyles.typeBadge} data-type={transaction.type}>
              {transaction.type}
            </span>
            {transaction.syncSource === 'teller' && (
              <span className={drawerStyles.syncBadge}>Synced</span>
            )}
            {matchedRule && (
              <span className={drawerStyles.ruleBadge} title={`Pattern: ${matchedRule.descriptionPattern}`}>
                ⚡ {matchedRule.name}
              </span>
            )}
            <span className={drawerStyles.date}>{formatDate(transaction.date)}</span>
          </div>
          <div className={drawerStyles.rawDesc}>{transaction.description}</div>
          <div
            className={drawerStyles.amount}
            data-sign={transaction.signedAmount < 0 ? 'neg' : 'pos'}
          >
            {transaction.signedAmount < 0 ? '−' : '+'}
            {formatCurrency(Math.abs(transaction.signedAmount))}
          </div>
        </div>

        {loading ? (
          <div className={drawerStyles.loading}>Loading…</div>
        ) : (
          <>
            {/* Editable fields — always available for any transaction */}
            {!isTransfer && (
              <div className={drawerStyles.form}>
                <div className={styles.field}>
                  <label className={styles.label}>Payee</label>
                  <div className={drawerStyles.combobox}>
                    <input
                      ref={payeeInputRef}
                      className={styles.input}
                      value={payeeText}
                      onChange={(e) => {
                        setPayeeText(e.target.value)
                        setPayeeOpen(true)
                      }}
                      onFocus={() => setPayeeOpen(true)}
                      onBlur={(e) => {
                        if (!payeeListRef.current?.contains(e.relatedTarget as Node)) {
                          setPayeeOpen(false)
                        }
                      }}
                      placeholder="Type or pick a payee…"
                      autoComplete="off"
                    />
                    {payeeOpen && filteredPayees.length > 0 && (
                      <ul
                        ref={payeeListRef}
                        className={drawerStyles.comboboxList}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {filteredPayees.map((p) => (
                          <li
                            key={p.id}
                            className={`${drawerStyles.comboboxItem} ${payeeText === p.name ? drawerStyles.comboboxItemActive : ''}`}
                            onClick={() => {
                              setPayeeText(p.name)
                              setPayeeOpen(false)
                              payeeInputRef.current?.blur()
                            }}
                          >
                            {p.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Category</label>
                  <select
                    className={styles.select}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">— uncategorized —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {recurringItems.length > 0 && (
                  <div className={styles.field}>
                    <label className={styles.label}>Link to recurring item</label>
                    <select
                      className={styles.select}
                      value={recurringItemId}
                      onChange={(e) => setRecurringItemId(e.target.value)}
                    >
                      <option value="">— none —</option>
                      {recurringItems.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({formatCurrency(r.amount)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* AI Insight panel — supplementary suggestions only */}
            {!isTransfer && insightDoc && (
              <div className={drawerStyles.insightPanel} data-status={insightDoc.status}>
                <div className={drawerStyles.insightHeader}>
                  <span className={drawerStyles.insightLabel}>
                    AI Suggestions
                    {insightDoc.ollamaConfidence && (
                      <span
                        className={drawerStyles.confidence}
                        data-level={insightDoc.ollamaConfidence}
                      >
                        {insightDoc.ollamaConfidence}
                      </span>
                    )}
                  </span>
                </div>
                <div className={drawerStyles.suggestionRows}>
                  {suggestedPayeeName && (
                    <div className={drawerStyles.suggestionRow}>
                      <span className={drawerStyles.suggestionLabel}>Payee</span>
                      <span className={drawerStyles.suggestionValue}>{suggestedPayeeName}</span>
                      <button
                        type="button"
                        className={`${drawerStyles.useBtn} ${payeeText === suggestedPayeeName ? drawerStyles.useBtnApplied : ''}`}
                        onClick={() => setPayeeText(suggestedPayeeName)}
                      >
                        {payeeText === suggestedPayeeName ? '✓' : 'Use'}
                      </button>
                    </div>
                  )}
                  {suggestedCat && (
                    <div className={drawerStyles.suggestionRow}>
                      <span className={drawerStyles.suggestionLabel}>Category</span>
                      <span className={drawerStyles.suggestionValue}>{suggestedCat.name}</span>
                      <button
                        type="button"
                        className={`${drawerStyles.useBtn} ${categoryId === suggestedCat.id ? drawerStyles.useBtnApplied : ''}`}
                        onClick={() => setCategoryId(suggestedCat.id)}
                      >
                        {categoryId === suggestedCat.id ? '✓' : 'Use'}
                      </button>
                    </div>
                  )}
                  {suggestedCandidates.length > 0 && (
                    <div
                      className={drawerStyles.suggestionRow}
                      style={{ alignItems: 'flex-start' }}
                    >
                      <span
                        className={drawerStyles.suggestionLabel}
                        style={{ paddingTop: '0.35rem' }}
                      >
                        Recurring
                      </span>
                      <div className={drawerStyles.candidateChips}>
                        {suggestedCandidates.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            className={`${drawerStyles.candidateChip} ${recurringItemId === r.id ? drawerStyles.candidateActive : ''}`}
                            onClick={() => setRecurringItemId(recurringItemId === r.id ? '' : r.id)}
                          >
                            {r.name} ({formatCurrency(r.amount)})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Analyze button */}
            {!isTransfer && (
              <button
                type="button"
                className={`${styles.buttonSecondary} ${drawerStyles.analyzeBtn}`}
                onClick={analyze}
                disabled={analyzing || saving}
              >
                {analyzing
                  ? 'Analyzing…'
                  : insightDoc
                    ? '↺ Re-analyze with AI'
                    : '✦ Analyze with AI'}
              </button>
            )}

            {error && <p className={drawerStyles.error}>{error}</p>}

            {/* Actions */}
            <div className={drawerStyles.actions}>
              <button
                type="button"
                className={styles.button}
                onClick={() => save(false)}
                disabled={saving || analyzing}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>

              {!isTransfer && (
                <button
                  type="button"
                  className={drawerStyles.ruleBtn}
                  data-hasrule={matchedRule ? 'true' : 'false'}
                  onClick={() => save(true)}
                  disabled={saving || analyzing}
                >
                  {saving ? (
                    'Saving…'
                  ) : (
                    <>
                      {matchedRule ? '↺ Update Rule' : '+ Create Rule'}
                      {matchingCount !== null && matchingCount > 1 && (
                        <span className={drawerStyles.matchCount}>{matchingCount} matching</span>
                      )}
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                className={`${styles.buttonSecondary} ${drawerStyles.cancelBtn}`}
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
