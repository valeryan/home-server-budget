'use client'

import React, { useState } from 'react'

interface BudgetItem {
  id: string
  name: string
  amount: number
  categoryId: string | null
  categoryName: string | null
  payeeId: string | null
  payeeName: string | null
}

interface TransferItem {
  id: string
  name: string
  amount: number
  direction: 'in' | 'out'
  otherAccountId: string | null
  otherAccountName: string | null
}

interface BudgetItemsListProps {
  incomeItems: BudgetItem[]
  expenseItems: BudgetItem[]
  transferItems: TransferItem[]
  budgetId: string
  accountId: string
  onRefresh?: () => void
}

export const BudgetItemsList: React.FC<BudgetItemsListProps> = ({
  incomeItems,
  expenseItems,
  transferItems,
  budgetId,
  accountId,
  onRefresh,
}) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [recording, setRecording] = useState<{ [key: string]: boolean }>({})

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
      setExpandedItem(null)
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

  const renderItem = (item: BudgetItem | TransferItem, type: 'income' | 'expense' | 'transfer') => {
    const isTransfer = 'direction' in item
    const isIncome = type === 'income' || (isTransfer && item.direction === 'in')
    const isExpanded = expandedItem === item.id
    const isRecording = recording[item.id]

    return (
      <div
        key={item.id}
        style={{
          background: 'var(--theme-elevation-0)',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: 'var(--border-radius)',
          marginBottom: 'var(--spacing-s)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'var(--spacing-m)',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', marginBottom: 'var(--spacing-xs)' }}>{item.name}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--theme-elevation-600)' }}>
              {!isTransfer && (
                <>
                  {(item as BudgetItem).categoryName && (
                    <span style={{ marginRight: 'var(--spacing-s)' }}>
                      📁 {(item as BudgetItem).categoryName}
                    </span>
                  )}
                  {(item as BudgetItem).payeeName && (
                    <span>👤 {(item as BudgetItem).payeeName}</span>
                  )}
                </>
              )}
              {isTransfer && (
                <span>
                  {item.direction === 'out' ? '➡️' : '⬅️'}{' '}
                  {item.direction === 'out' ? 'To' : 'From'}: {item.otherAccountName || 'Unknown'}
                </span>
              )}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-m)',
            }}
          >
            <div
              style={{
                fontSize: '1.125rem',
                fontWeight: 'bold',
                color: isIncome ? 'var(--theme-success-500)' : 'var(--theme-error-500)',
                minWidth: '100px',
                textAlign: 'right',
              }}
            >
              {isIncome ? '+' : '-'}
              {formatCurrency(item.amount)}
            </div>
            <button
              onClick={() => setExpandedItem(isExpanded ? null : item.id)}
              className="btn btn--style-primary btn--size-small"
              style={{ whiteSpace: 'nowrap' }}
            >
              {isExpanded ? '✕ Cancel' : '✓ Record'}
            </button>
          </div>
        </div>

        {isExpanded && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const formData = {
                date: (form.elements.namedItem('date') as HTMLInputElement).value,
                amount: (form.elements.namedItem('amount') as HTMLInputElement).value,
                notes: (form.elements.namedItem('notes') as HTMLTextAreaElement).value,
              }
              handleRecordTransaction(item.id, type, item, formData)
            }}
            style={{
              padding: 'var(--spacing-m)',
              paddingTop: 0,
              borderTop: '1px solid var(--theme-elevation-150)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--spacing-m)',
                marginBottom: 'var(--spacing-m)',
              }}
            >
              <div>
                <label
                  htmlFor={`date-${item.id}`}
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: 'var(--spacing-xs)',
                  }}
                >
                  Date
                </label>
                <input
                  type="date"
                  id={`date-${item.id}`}
                  name="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-s)',
                    border: '1px solid var(--theme-elevation-150)',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor={`amount-${item.id}`}
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: 'var(--spacing-xs)',
                  }}
                >
                  Actual Amount
                </label>
                <input
                  type="number"
                  id={`amount-${item.id}`}
                  name="amount"
                  step="0.01"
                  defaultValue={item.amount}
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-s)',
                    border: '1px solid var(--theme-elevation-150)',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 'var(--spacing-m)' }}>
              <label
                htmlFor={`notes-${item.id}`}
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: 'var(--spacing-xs)',
                }}
              >
                Notes (optional)
              </label>
              <textarea
                id={`notes-${item.id}`}
                name="notes"
                rows={2}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-s)',
                  border: '1px solid var(--theme-elevation-150)',
                  borderRadius: 'var(--border-radius)',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={isRecording}
              className="btn btn--style-primary btn--size-small"
            >
              {isRecording ? 'Creating Transaction...' : 'Create Transaction'}
            </button>
          </form>
        )}
      </div>
    )
  }

  return (
    <div style={{ marginTop: 'var(--spacing-xxl)' }}>
      {/* Income Section */}
      {incomeItems.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h4
            style={{
              marginBottom: 'var(--spacing-m)',
              fontSize: '0.875rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              color: 'var(--theme-elevation-600)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-s)',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>💰</span>
            Income ({incomeItems.length})
          </h4>
          {incomeItems.map((item) => renderItem(item, 'income'))}
        </div>
      )}

      {/* Expenses Section */}
      {expenseItems.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h4
            style={{
              marginBottom: 'var(--spacing-m)',
              fontSize: '0.875rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              color: 'var(--theme-elevation-600)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-s)',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>💳</span>
            Expenses ({expenseItems.length})
          </h4>
          {expenseItems.map((item) => renderItem(item, 'expense'))}
        </div>
      )}

      {/* Transfers Section */}
      {transferItems.length > 0 && (
        <div>
          <h4
            style={{
              marginBottom: 'var(--spacing-m)',
              fontSize: '0.875rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              color: 'var(--theme-elevation-600)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-s)',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>↔️</span>
            Transfers ({transferItems.length})
          </h4>
          {transferItems.map((item) => renderItem(item, 'transfer'))}
        </div>
      )}

      {incomeItems.length === 0 && expenseItems.length === 0 && transferItems.length === 0 && (
        <div
          style={{
            padding: 'var(--spacing-xl)',
            textAlign: 'center',
            color: 'var(--theme-elevation-600)',
            fontStyle: 'italic',
          }}
        >
          No budget items for this period
        </div>
      )}
    </div>
  )
}
