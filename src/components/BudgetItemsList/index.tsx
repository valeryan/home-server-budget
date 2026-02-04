'use client'

import React, { useState } from 'react'
import { BudgetItem, TransferItem } from '@/lib/budget-types'
import styles from './styles.module.scss'

interface BudgetItemsListProps {
  incomeItems: BudgetItem[]
  expenseItems: BudgetItem[]
  transferItems: TransferItem[]
  budgetId: string
  accountId: string
  startDate: string
  endDate: string
  onRefresh?: () => void
}

export const BudgetItemsList: React.FC<BudgetItemsListProps> = ({
  incomeItems,
  expenseItems,
  transferItems,
  budgetId,
  accountId,
  startDate,
  endDate,
  onRefresh,
}) => {
  const [modalItemId, setModalItemId] = useState<string | null>(null)
  // Format dates for input min/max (YYYY-MM-DD)
  const minDate = new Date(startDate).toISOString().split('T')[0]
  const maxDate = new Date(endDate).toISOString().split('T')[0]

  // Form state for Recording
  const [recording, setRecording] = useState<{ [key: string]: boolean }>({})


  // Form state
  // (Previously local transaction type state was here)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const handleRecordTransaction = async (
    itemId: string,
    itemType: 'income' | 'expense' | 'transfer',
    item: BudgetItem | TransferItem,
    formData: { date: string; amount: string; notes: string },
  ) => {
    setRecording((prev) => ({ ...prev, [itemId]: true }))

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transactionData: any = {
        date: new Date(formData.date).toISOString(),
        account: accountId,
        type: itemType,
        description: item.name,
        amount: parseFloat(formData.amount),
        notes: formData.notes,
      }

      // Add type-specific fields
      if (itemType === 'income' && 'categoryId' in item) {
        transactionData.incomeDetails = {
          category: item.categoryId,
          payee: item.payeeId,
        }
      } else if (itemType === 'expense' && 'categoryId' in item) {
        transactionData.expenseDetails = {
          category: item.categoryId,
          payee: item.payeeId,
        }
      } else if (itemType === 'transfer' && 'otherAccountId' in item) {
        transactionData.transferDetails = {
          toAccount: item.otherAccountId,
        }
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      })

      if (!response.ok) {
        throw new Error('Failed to create transaction')
      }

      const transactionResult = await response.json()
      const transactionId = transactionResult.doc?.id

      console.log('Transaction created:', transactionId)

      // Create a budget item record to track this actualization
      if (transactionId) {
        console.log('Creating budget item:', {
          budget: budgetId,
          recurringItem: itemId,
          dueDate: formData.date,
          isActualized: true,
          transaction: transactionId,
        })

        const budgetItemResponse = await fetch('/api/budget-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            budget: budgetId,
            recurringItem: itemId,
            dueDate: formData.date,
            isActualized: true,
            transaction: transactionId,
          }),
        })

        if (!budgetItemResponse.ok) {
          console.error('Failed to create budget item:', await budgetItemResponse.text())
        } else {
          const budgetItemResult = await budgetItemResponse.json()
          console.log('Budget item created:', budgetItemResult.doc?.id)
        }
      }

      // Close the form and refresh
      setModalItemId(null)
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Error creating transaction:', error)
      alert('Failed to create transaction. Please try again.')
    } finally {
      setRecording((prev) => ({ ...prev, [itemId]: false }))
    }
  }

  const renderTable = (
    title: string,
    items: (BudgetItem | TransferItem)[],
    type: 'income' | 'expense' | 'transfer'
  ) => {
    if (items.length === 0) return null

    return (
      <div className={styles.section}>
        <h4 className={styles.tableHeader}>
          {title} <span className={styles.count}>({items.length})</span>
        </h4>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <colgroup>
              <col className={styles.colName} />
              <col className={styles.colCategory} />
              <col className={styles.colPayee} />
              <col className={styles.colAmount} />
              <col className={styles.colAction} />
            </colgroup>
            <thead>
              <tr className={styles.tableHeadRow}>
                <th>Name</th>
                <th>Category</th>
                <th>Payee / Account</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ width: '120px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const isTransfer = 'direction' in item
                const isRecording = recording[item.id]

                return (
                  <React.Fragment key={item.id}>
                    <tr className={styles.tableRow}>
                      <td className={styles.itemName}>{item.name}</td>
                      <td className={styles.categoryCell}>
                        {!isTransfer ? (
                          <span className={styles.categoryTag}>
                            {(item as BudgetItem).categoryName || '—'}
                          </span>
                        ) : (
                          <span className={styles.categoryTag}>Transfer</span>
                        )}
                      </td>
                      <td className={styles.payeeCell}>
                        {!isTransfer ? (
                          <span>{(item as BudgetItem).payeeName || '—'}</span>
                        ) : (
                          <span>{(item as TransferItem).otherAccountName || 'Unknown'}</span>
                        )}
                      </td>
                      <td className={styles.amountCell}>
                        {formatCurrency(item.amount)}
                      </td>
                      <td className={styles.actionCell}>
                         <button
                            onClick={() => setModalItemId(item.id)}
                            className="btn btn--size-small btn--style-primary"
                          >
                            Record
                          </button>
                      </td>
                    </tr>
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const allItems = [...incomeItems, ...expenseItems, ...transferItems]
  const modalItem = modalItemId ? allItems.find((item) => item.id === modalItemId) : undefined
  const modalItemType = modalItemId
    ? incomeItems.some((item) => item.id === modalItemId)
      ? 'income'
      : expenseItems.some((item) => item.id === modalItemId)
        ? 'expense'
        : 'transfer'
    : null

  return (
    <div className={styles.section}>
      {/* Income Section */}
      {renderTable('💰 Income', incomeItems, 'income')}

      {/* Expenses Section */}
      {renderTable('💳 Expenses', expenseItems, 'expense')}

      {/* Transfers Section */}
      {renderTable('↔️ Transfers', transferItems, 'transfer')}

      {incomeItems.length === 0 && expenseItems.length === 0 && transferItems.length === 0 && (
        <div className={styles.emptyState}>
          No budget items for this period
        </div>
      )}

      {modalItem && (
          <div className={styles.modalOverlay} onClick={() => setModalItemId(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Record Transaction</h3>
              <button className={styles.modalClose} onClick={() => setModalItemId(null)}>
                ×
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const formData = {
                  date: (form.elements.namedItem('date') as HTMLInputElement).value,
                  amount: (form.elements.namedItem('amount') as HTMLInputElement).value,
                  notes: (form.elements.namedItem('notes') as HTMLTextAreaElement).value,
                }
                if (modalItemType) {
                  handleRecordTransaction(modalItem.id, modalItemType, modalItem, formData)
                }
                setModalItemId(null)
              }}
            >
              <div className={styles.formGrid}>
                <div className="field-type date">
                  <label className="field-label">Date</label>
                  <input
                    className="field-input"
                    type="date"
                    name="date"
                    defaultValue={
                      modalItem.dueDate
                        ? new Date(modalItem.dueDate).toISOString().split('T')[0]
                        : new Date().toISOString().split('T')[0]
                    }
                    min={minDate}
                    max={maxDate}
                    required
                  />
                </div>
                <div className="field-type number">
                  <label className="field-label">Actual Amount</label>
                  <input
                    className="field-input"
                    type="number"
                    name="amount"
                    step="0.01"
                    defaultValue={modalItem.amount}
                    required
                  />
                </div>
              </div>

              <div className="field-type textarea" style={{ marginBottom: '1.5rem' }}>
                <label className="field-label">Notes</label>
                <textarea className="field-input" name="notes" rows={2} />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className="btn btn--style-secondary"
                  onClick={() => setModalItemId(null)}
                  disabled={recording[modalItem.id]}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recording[modalItem.id]}
                  className="btn btn--style-primary"
                >
                  {recording[modalItem.id] ? 'Creating...' : 'Create Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
