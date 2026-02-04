import React, { useEffect, useState } from 'react'
import { BudgetItem, TransferItem, TransactionItem } from '@/lib/budget-types'
import { formatCurrency } from '@/lib/formatting'
import { Modal } from '../Modal'
import styles from './styles.module.scss'

interface TransactionTableProps {
  title: string
  items: TransactionItem[]
  type: 'income' | 'expense' | 'transfer'
  onRefresh?: () => void
}

type TransactionType = 'income' | 'expense' | 'transfer'

interface TransactionDetail {
  id: string
  type: TransactionType
  date: string
  description: string
  amount: number
  notes?: string | null
  account: { id: string; name?: string } | string
  incomeDetails?: { category?: { id: string; name?: string } | string; payee?: { id: string; name?: string } | string }
  expenseDetails?: { category?: { id: string; name?: string } | string; payee?: { id: string; name?: string } | string }
  transferDetails?: { toAccount?: { id: string; name?: string } | string }
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ title, items, type, onRefresh }) => {
  const [editingTransaction, setEditingTransaction] = useState<TransactionDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [incomeCategories, setIncomeCategories] = useState<{ id: string; name: string }[]>([])
  const [expenseCategories, setExpenseCategories] = useState<{ id: string; name: string }[]>([])
  const [payees, setPayees] = useState<{ id: string; name: string }[]>([])
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([])
  const [editForm, setEditForm] = useState<{
    date: string
    type: TransactionType
    description: string
    amount: string
    notes: string
    categoryName: string
    payeeName: string
    toAccountId: string
  } | null>(null)

  const getAccountId = (value?: { id: string } | string | null) =>
    typeof value === 'string' ? value : value?.id || ''

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [incRes, expRes, payRes, acctRes] = await Promise.all([
          fetch('/api/income-categories?limit=200&sort=name'),
          fetch('/api/expense-categories?limit=200&sort=name'),
          fetch('/api/payees?limit=200&sort=name'),
          fetch('/api/accounts?limit=200&sort=name'),
        ])

        const incData = await incRes.json()
        const expData = await expRes.json()
        const payData = await payRes.json()
        const acctData = await acctRes.json()

        setIncomeCategories(incData.docs || [])
        setExpenseCategories(expData.docs || [])
        setPayees(payData.docs || [])
        setAccounts(acctData.docs || [])
      } catch (error) {
        console.error('Failed to load transaction options:', error)
      }
    }

    fetchOptions()
  }, [])

  const openEditModal = async (transactionId: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/transactions/${transactionId}?depth=1`)
      if (!res.ok) throw new Error('Failed to fetch transaction')
      const data = await res.json()
      setEditingTransaction(data)
      const typeValue = data.type as TransactionType
      const categoryName =
        typeValue === 'income'
          ? typeof data.incomeDetails?.category === 'object'
            ? data.incomeDetails?.category?.name || ''
            : ''
          : typeValue === 'expense'
            ? typeof data.expenseDetails?.category === 'object'
              ? data.expenseDetails?.category?.name || ''
              : ''
            : ''
      const payeeName =
        typeValue === 'income'
          ? typeof data.incomeDetails?.payee === 'object'
            ? data.incomeDetails?.payee?.name || ''
            : ''
          : typeValue === 'expense'
            ? typeof data.expenseDetails?.payee === 'object'
              ? data.expenseDetails?.payee?.name || ''
              : ''
            : ''
      const toAccountId =
        typeValue === 'transfer'
          ? typeof data.transferDetails?.toAccount === 'object'
            ? data.transferDetails?.toAccount?.id || ''
            : typeof data.transferDetails?.toAccount === 'string'
              ? data.transferDetails?.toAccount
              : ''
          : ''
      const fromAccountId = getAccountId(data.account)
      setEditForm({
        date: data.date?.split('T')[0] || '',
        type: typeValue,
        description: data.description || '',
        amount: String(data.amount ?? ''),
        notes: data.notes || '',
        categoryName,
        payeeName,
        toAccountId: toAccountId || '',
      })
      if (typeValue === 'transfer' && toAccountId && toAccountId === fromAccountId) {
        setEditForm((prev) => (prev ? { ...prev, toAccountId: '' } : prev))
      }
    } catch (error) {
      console.error('Failed to load transaction:', error)
      alert('Failed to load transaction. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const closeModal = () => {
    if (isSaving || isDeleting) return
    setEditingTransaction(null)
    setEditForm(null)
  }

  const ensureEntity = async (
    name: string,
    collection: 'income-categories' | 'expense-categories' | 'payees',
    existingList: { id: string; name: string }[],
  ): Promise<string | null> => {
    if (!name) return null

    const existing = existingList.find((i) => i.name.toLowerCase() === name.toLowerCase())
    if (existing) return existing.id

    try {
      const res = await fetch(`/api/${collection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (!res.ok) throw new Error(`Failed to create ${collection}`)

      const json = await res.json()
      const newId = json.doc?.id
      const newItem = { id: newId, name: json.doc.name }

      if (collection === 'income-categories') {
        setIncomeCategories((prev) => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name)))
      } else if (collection === 'expense-categories') {
        setExpenseCategories((prev) => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name)))
      } else if (collection === 'payees') {
        setPayees((prev) => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name)))
      }

      return newId
    } catch (error) {
      console.error(error)
      alert(`Failed to create new ${collection.replace('-', ' ')}`)
      return null
    }
  }

  const handleSave = async () => {
    if (!editingTransaction || !editForm) return
    setIsSaving(true)

    try {
      let categoryId: string | null = null
      let payeeId: string | null = null

      if (editForm.type !== 'transfer' && editForm.categoryName) {
        categoryId = await ensureEntity(
          editForm.categoryName,
          editForm.type === 'income' ? 'income-categories' : 'expense-categories',
          editForm.type === 'income' ? incomeCategories : expenseCategories,
        )
      }

      if (editForm.type !== 'transfer' && editForm.payeeName) {
        payeeId = await ensureEntity(editForm.payeeName, 'payees', payees)
      }

      if (editForm.type === 'transfer' && !editForm.toAccountId) {
        throw new Error('Please select a destination account')
      }

      const payload: Record<string, unknown> = {
        date: new Date(editForm.date).toISOString(),
        type: editForm.type,
        description: editForm.description,
        amount: parseFloat(editForm.amount || '0'),
        notes: editForm.notes,
      }

      if (editForm.type === 'income') {
        payload.incomeDetails = {
          category: categoryId,
          payee: payeeId,
        }
        payload.expenseDetails = {}
        payload.transferDetails = {}
      } else if (editForm.type === 'expense') {
        payload.expenseDetails = {
          category: categoryId,
          payee: payeeId,
        }
        payload.incomeDetails = {}
        payload.transferDetails = {}
      } else if (editForm.type === 'transfer') {
        payload.transferDetails = {
          toAccount: editForm.toAccountId,
        }
        payload.incomeDetails = {}
        payload.expenseDetails = {}
      }

      const res = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to update transaction')
      setEditingTransaction(null)
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error('Failed to update transaction:', error)
      alert('Failed to update transaction. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (transactionId: string) => {
    const confirmed = window.confirm('Delete this transaction? This cannot be undone.')
    if (!confirmed) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete transaction')
      setEditingTransaction(null)
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error('Failed to delete transaction:', error)
      alert('Failed to delete transaction. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (items.length === 0) return null

  return (
    <div className={styles.section}>
      <h4 className={styles.title}>
        {title} <span className={styles.count}>({items.length})</span>
      </h4>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr className={styles.theadRow}>
              <th className={styles.colDesc}>Description</th>
              <th className={styles.cell}>Category</th>
              <th className={styles.cell}>{type === 'transfer' ? 'Account' : 'Payee'}</th>
              <th className={`${styles.cell} ${styles.colAmount}`} style={{ textAlign: 'right' }}>Amount</th>
              <th className={styles.actionsHeader}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isTransfer = 'direction' in item
              const isIncome = type === 'income' || (isTransfer && item.direction === 'in')

              return (
                <tr key={item.id} className={styles.row}>
                  <td className={styles.nameCell}>
                      <button
                        className={styles.nameButton}
                        onClick={() => openEditModal(item.id)}
                      >
                        {item.name}
                      </button>
                  </td>
                  <td className={styles.detailsCell}>
                    {!isTransfer ? (
                      <span className={styles.categoryTag}>
                        {(item as any).categoryName || '—'}
                      </span>
                    ) : (
                      <span className={styles.categoryTag}>Transfer</span>
                    )}
                  </td>
                  <td className={styles.detailsCell}>
                    {!isTransfer ? (
                      <span className={styles.payee}>
                        {(item as any).payeeName || '—'}
                      </span>
                    ) : (
                      <span className={styles.payee}>
                        {(item as any).otherAccountName || '—'}
                      </span>
                    )}
                  </td>
                  <td className={styles.amountCell}>
                      <span className={`${isIncome ? styles.textSuccess : styles.textError}`}>
                        {isIncome ? '+' : '-'} {formatCurrency(item.amount)}
                      </span>
                  </td>
                  <td className={styles.actionsCell}>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editingTransaction && (
        <Modal title="Edit Transaction" onClose={closeModal} size="lg" bodyClassName={styles.modalBody}>
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <>
              {editForm && (
                <>
                  <div className={styles.modalGrid}>
                    <div className="field-type date">
                      <label className="field-label">Date</label>
                      <input
                        className="field-input"
                        type="date"
                        value={editForm.date}
                        onChange={(e) =>
                          setEditForm((prev) => (prev ? { ...prev, date: e.target.value } : prev))
                        }
                      />
                    </div>
                    <div className="field-type text">
                      <label className="field-label">Type</label>
                      <input className="field-input" type="text" value={editForm.type} readOnly />
                    </div>
                  </div>

                  <div className={styles.modalGrid}>
                    <div className="field-type text">
                      <label className="field-label">Description</label>
                      <input
                        className="field-input"
                        type="text"
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm((prev) =>
                            prev ? { ...prev, description: e.target.value } : prev,
                          )
                        }
                      />
                    </div>
                    <div className="field-type number">
                      <label className="field-label">Amount</label>
                      <input
                        className="field-input"
                        type="number"
                        step="0.01"
                        value={editForm.amount}
                        onChange={(e) =>
                          setEditForm((prev) => (prev ? { ...prev, amount: e.target.value } : prev))
                        }
                      />
                    </div>
                  </div>

                  {editForm.type !== 'transfer' && (
                    <div className={styles.modalGrid}>
                      <div className="field-type text">
                        <label className="field-label">Category</label>
                        <input
                          className="field-input"
                          type="text"
                          name="categoryName"
                          placeholder="Select or type new..."
                          autoComplete="off"
                          value={editForm.categoryName}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev ? { ...prev, categoryName: e.target.value } : prev,
                            )
                          }
                        />
                        <div className={styles.inlineSelect}>
                          <label className={styles.inlineLabel}>Pick existing</label>
                          <div className="select-container">
                            <select
                              className="field-input"
                              value=""
                              onChange={(e) =>
                                setEditForm((prev) =>
                                  prev ? { ...prev, categoryName: e.target.value } : prev,
                                )
                              }
                            >
                              <option value="">Select...</option>
                              {(editForm.type === 'income' ? incomeCategories : expenseCategories).map((cat) => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="field-type text">
                        <label className="field-label">Payee</label>
                        <input
                          className="field-input"
                          type="text"
                          name="payeeName"
                          placeholder="Select or type new..."
                          autoComplete="off"
                          value={editForm.payeeName}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev ? { ...prev, payeeName: e.target.value } : prev,
                            )
                          }
                        />
                        <div className={styles.inlineSelect}>
                          <label className={styles.inlineLabel}>Pick existing</label>
                          <div className="select-container">
                            <select
                              className="field-input"
                              value=""
                              onChange={(e) =>
                                setEditForm((prev) =>
                                  prev ? { ...prev, payeeName: e.target.value } : prev,
                                )
                              }
                            >
                              <option value="">Select...</option>
                              {payees.map((payee) => (
                                <option key={payee.id} value={payee.name}>{payee.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {editForm.type === 'transfer' && (
                    <div className={styles.modalGrid}>
                      <div className="field-type select">
                        <label className="field-label">To Account</label>
                        <div className="select-container">
                          <select
                            className="field-input"
                            value={editForm.toAccountId}
                            onChange={(e) =>
                              setEditForm((prev) =>
                                prev ? { ...prev, toAccountId: e.target.value } : prev,
                              )
                            }
                          >
                            <option value="">Select destination...</option>
                            {accounts
                              .filter((acct) => {
                                const fromAccountId = editingTransaction
                                  ? getAccountId(editingTransaction.account)
                                  : ''
                                return acct.id !== fromAccountId
                              })
                              .map((acct) => (
                                <option key={acct.id} value={acct.id}>
                                  {acct.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={styles.modalGrid}>
                    <div className="field-type textarea">
                      <label className="field-label">Notes</label>
                      <textarea
                        className="field-input"
                        rows={3}
                        value={editForm.notes}
                        onChange={(e) =>
                          setEditForm((prev) => (prev ? { ...prev, notes: e.target.value } : prev))
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div className={styles.modalActions}>
            <button className="btn btn--style-secondary" onClick={closeModal} disabled={isSaving || isDeleting}>
              Cancel
            </button>
            <button
              className="btn btn--style-secondary"
              onClick={() => handleDelete(editingTransaction.id)}
              disabled={isSaving || isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
            <button className="btn btn--style-primary" onClick={handleSave} disabled={isSaving || isDeleting}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
