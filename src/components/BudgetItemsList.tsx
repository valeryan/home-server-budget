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
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [recording, setRecording] = useState<{ [key: string]: boolean }>({})
  const [showAdHocForm, setShowAdHocForm] = useState(false)
  const [isSubmittingAdHoc, setIsSubmittingAdHoc] = useState(false)

  // Format dates for input min/max (YYYY-MM-DD)
  const minDate = new Date(startDate).toISOString().split('T')[0]
  const maxDate = new Date(endDate).toISOString().split('T')[0]

  // Data state
  const [incomeCategories, setIncomeCategories] = useState<{id: string, name: string}[]>([])
  const [expenseCategories, setExpenseCategories] = useState<{id: string, name: string}[]>([])
  const [payees, setPayees] = useState<{id: string, name: string}[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  // Fetch options when ad-hoc form opens
  React.useEffect(() => {
    const fetchOptions = async () => {
      if (!showAdHocForm) return;
      if (incomeCategories.length > 0 && expenseCategories.length > 0 && payees.length > 0) return; // Already fetched

      setLoadingOptions(true)
      try {
        const [incRes, expRes, payRes] = await Promise.all([
          fetch('/api/income-categories?limit=100&sort=name'),
          fetch('/api/expense-categories?limit=100&sort=name'),
          fetch('/api/payees?limit=100&sort=name')
        ])

        const incData = await incRes.json()
        const expData = await expRes.json()
        const payData = await payRes.json()

        setIncomeCategories(incData.docs || [])
        setExpenseCategories(expData.docs || [])
        setPayees(payData.docs || [])
      } catch (e) {
        console.error("Failed to load options", e)
      } finally {
        setLoadingOptions(false)
      }
    }
    fetchOptions()
  }, [showAdHocForm, incomeCategories.length, expenseCategories.length, payees.length])

  // Helper to find or create an entity
  const ensureEntity = async (
    name: string,
    collection: 'income-categories' | 'expense-categories' | 'payees',
    existingList: {id: string, name: string}[]
  ): Promise<string | null> => {
    if (!name) return null;

    // Case-insensitive check
    const existing = existingList.find(i => i.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;

    // Create new
    try {
      console.log(`Creating new ${collection}: ${name}`);
      const res = await fetch(`/api/${collection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!res.ok) throw new Error(`Failed to create ${collection}`);

      const json = await res.json();
      const newId = json.doc?.id;

      // Optimistically update local list to avoid re-fetching immediately
      const newItem = { id: newId, name: json.doc.name };
      if (collection === 'income-categories') setIncomeCategories(prev => [...prev, newItem].sort((a,b) => a.name.localeCompare(b.name)));
      else if (collection === 'expense-categories') setExpenseCategories(prev => [...prev, newItem].sort((a,b) => a.name.localeCompare(b.name)));
      else if (collection === 'payees') setPayees(prev => [...prev, newItem].sort((a,b) => a.name.localeCompare(b.name)));

      return newId;
    } catch (e) {
      console.error(e);
      alert(`Failed to create new ${collection.replace('-', ' ')}: ${name}`);
      return null;
    }
  }

  // Form state
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense')

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

  const renderTable = (
    title: string,
    items: (BudgetItem | TransferItem)[],
    type: 'income' | 'expense' | 'transfer'
  ) => {
    if (items.length === 0) return null

    return (
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h4 style={{ marginBottom: 'var(--spacing-s)' }}>
          {title} <span style={{ color: 'var(--theme-elevation-400)', fontWeight: 'normal' }}>({items.length})</span>
        </h4>
        <div style={{
          background: 'var(--theme-elevation-0)',
          border: '1px solid var(--theme-elevation-100)',
          borderRadius: 'var(--border-radius)',
          overflow: 'hidden'
        }}>
          <table cellPadding="0" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                borderBottom: '1px solid var(--theme-elevation-100)',
                background: 'var(--theme-elevation-50)',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                textAlign: 'left'
              }}>
                <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--theme-elevation-500)' }}>Name</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--theme-elevation-500)' }}>Details</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--theme-elevation-500)', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--theme-elevation-500)', width: '120px' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const isTransfer = 'direction' in item
                const isExpanded = expandedItem === item.id
                const isRecording = recording[item.id]

                return (
                  <React.Fragment key={item.id}>
                    <tr style={{ borderBottom: '1px solid var(--theme-elevation-100)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '500' }}>{item.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--theme-elevation-600)', fontSize: '0.875rem' }}>
                         {!isTransfer && (
                          <>
                            {(item as BudgetItem).categoryName && (
                              <span style={{
                                display: 'inline-block',
                                background: 'var(--theme-elevation-100)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                marginRight: '8px',
                                fontSize: '0.75rem'
                              }}>
                                {(item as BudgetItem).categoryName}
                              </span>
                            )}
                            {(item as BudgetItem).payeeName && (
                              <span>{(item as BudgetItem).payeeName}</span>
                            )}
                          </>
                        )}
                        {isTransfer && (
                          <span>
                            {item.direction === 'out' ? 'To' : 'From'}: {item.otherAccountName || 'Unknown'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>
                        {formatCurrency(item.amount)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                         <button
                            onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                            className={`btn btn--size-small ${isExpanded ? 'btn--style-secondary' : 'btn--style-primary'}`}
                          >
                            {isExpanded ? 'Cancel' : 'Record'}
                          </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={4} style={{ background: 'var(--theme-elevation-50)', padding: '20px', borderBottom: '1px solid var(--theme-elevation-100)' }}>
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
                          >
                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                               {/* Date */}
                               <div className="field-type date">
                                 <label className="field-label">Date</label>
                                 <input
                                   className="field-input"
                                   type="date"
                                   name="date"
                                   defaultValue={new Date().toISOString().split('T')[0]}
                                   min={minDate}
                                   max={maxDate}
                                   required
                                 />
                               </div>
                               {/* Amount */}
                               <div className="field-type number">
                                 <label className="field-label">Actual Amount</label>
                                 <input
                                   className="field-input"
                                   type="number"
                                   name="amount"
                                   step="0.01"
                                   defaultValue={item.amount}
                                   required
                                 />
                               </div>
                             </div>

                             {/* Notes */}
                             <div className="field-type textarea" style={{ marginBottom: '20px' }}>
                               <label className="field-label">Notes</label>
                               <textarea
                                 className="field-input"
                                 name="notes"
                                 rows={2}
                               />
                             </div>

                             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                  type="submit"
                                  disabled={isRecording}
                                  className="btn btn--style-primary"
                                >
                                  {isRecording ? 'Creating...' : 'Create Transaction'}
                                </button>
                             </div>
                           </form>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }



  return (
    <div style={{ marginTop: 'var(--spacing-xxl)' }}>
      {/* Income Section */}
      {/* Income Section */}
      {renderTable('💰 Income', incomeItems, 'income')}

      {/* Expenses Section */}
      {renderTable('💳 Expenses', expenseItems, 'expense')}

      {/* Transfers Section */}
      {renderTable('↔️ Transfers', transferItems, 'transfer')}

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

      {/* Ad-hoc Transaction Section */}
      <div style={{ marginTop: '40px', borderTop: '1px solid var(--theme-elevation-150)', paddingTop: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>Ad-hoc Transactions</h3>
           {!showAdHocForm && (
             <button
               onClick={() => setShowAdHocForm(true)}
               className="btn btn--style-secondary"
             >
               + New Ad-hoc
             </button>
           )}
        </div>

        {showAdHocForm && (
          <div style={{
            background: 'var(--theme-elevation-0)',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 'var(--border-radius)',
            padding: '25px'
          }}>
            <form
               onSubmit={async (e) => {
                 e.preventDefault()
                 setIsSubmittingAdHoc(true)
                 const form = e.target as HTMLFormElement
                 const type = (form.elements.namedItem('type') as HTMLSelectElement).value as 'income' | 'expense'

                 const categoryName = (form.elements.namedItem('categoryName') as HTMLInputElement).value
                 const payeeName = (form.elements.namedItem('payeeName') as HTMLInputElement).value

                 const formData = {
                   date: (form.elements.namedItem('date') as HTMLInputElement).value,
                   amount: (form.elements.namedItem('amount') as HTMLInputElement).value,
                   description: (form.elements.namedItem('description') as HTMLInputElement).value,
                   notes: (form.elements.namedItem('notes') as HTMLTextAreaElement).value,
                 }

                 try {
                    // Resolve Category
                    let categoryId: string | null = null
                    if (categoryName) {
                      categoryId = await ensureEntity(
                        categoryName,
                        type === 'income' ? 'income-categories' : 'expense-categories',
                        type === 'income' ? incomeCategories : expenseCategories
                      )
                    }

                    // Resolve Payee
                    let payeeId: string | null = null
                    if (payeeName) {
                       payeeId = await ensureEntity(payeeName, 'payees', payees)
                    }

                    const reqBody: any = {
                      date: new Date(formData.date).toISOString(),
                      account: accountId,
                      type: type,
                      amount: parseFloat(formData.amount),
                      description: formData.description,
                      notes: formData.notes,
                    }

                    // Add details based on type
                    if (type === 'income') {
                      reqBody.incomeDetails = {
                        category: categoryId,
                        payee: payeeId
                      }
                    } else {
                      reqBody.expenseDetails = {
                        category: categoryId,
                        payee: payeeId
                      }
                    }

                    const response = await fetch('/api/transactions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(reqBody),
                    })

                    if (!response.ok) throw new Error('Failed to create ad-hoc transaction')

                    // Reset and refresh
                    form.reset()
                    setTransactionType('expense') // Reset to default
                    setShowAdHocForm(false)
                    if (onRefresh) onRefresh()

                 } catch (error) {
                   console.error('Error creating ad-hoc transaction:', error)
                   alert('Failed to create transaction')
                 } finally {
                   setIsSubmittingAdHoc(false)
                 }
               }}
             >
               {loadingOptions && (
                   <div style={{ fontSize: '0.875rem', color: 'var(--theme-elevation-600)', marginBottom: 'var(--spacing-m)' }}>Loading options...</div>
               )}

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                 <div className="field-type date">
                   <label className="field-label">Date</label>
                   <input
                     className="field-input"
                     type="date"
                     name="date"
                     required
                     defaultValue={new Date().toISOString().split('T')[0]}
                     min={minDate}
                     max={maxDate}
                   />
                 </div>
                 <div className="field-type select">
                   <label className="field-label">Type</label>
                   <div className="select-container">
                    <select
                      className="field-input"
                      name="type"
                      value={transactionType}
                      onChange={(e) => setTransactionType(e.target.value as 'income' | 'expense')}
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                   </div>
                 </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div className="field-type text">
                     <label className="field-label">Category</label>
                     <input
                       className="field-input"
                       type="text"
                       name="categoryName"
                       list="category-options"
                       placeholder="Select or type new..."
                       autoComplete="off"
                     />
                     <datalist id="category-options">
                       {(transactionType === 'income' ? incomeCategories : expenseCategories).map(cat => (
                         <option key={cat.id} value={cat.name} />
                       ))}
                     </datalist>
                  </div>
                   <div className="field-type text">
                     <label className="field-label">Payee</label>
                     <input
                       className="field-input"
                       type="text"
                       name="payeeName"
                       list="payee-options"
                       placeholder="Select or type new..."
                       autoComplete="off"
                     />
                     <datalist id="payee-options">
                       {payees.map(payee => (
                         <option key={payee.id} value={payee.name} />
                       ))}
                     </datalist>
                  </div>
               </div>

               <div style={{ marginBottom: '20px' }}>
                  <div className="field-type text">
                    <label className="field-label">Description</label>
                    <input
                      className="field-input"
                      type="text"
                      name="description"
                      required
                      placeholder="e.g. Groceries, Dining Out"
                    />
                  </div>
               </div>

               <div style={{ marginBottom: '20px' }}>
                  <div className="field-type number">
                    <label className="field-label">Amount</label>
                    <input
                      className="field-input"
                      type="number"
                      name="amount"
                      step="0.01"
                      required
                    />
                  </div>
               </div>

               <div style={{ marginBottom: '30px' }}>
                  <div className="field-type textarea">
                    <label className="field-label">Notes</label>
                    <textarea
                      className="field-input"
                      name="notes"
                      rows={2}
                    />
                  </div>
               </div>

               <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                 <button
                   type="button"
                   onClick={() => setShowAdHocForm(false)}
                   className="btn btn--style-secondary"
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   disabled={isSubmittingAdHoc}
                   className="btn btn--style-primary"
                 >
                   {isSubmittingAdHoc ? 'Saving...' : 'Save Transaction'}
                 </button>
               </div>
             </form>
          </div>
        )}
      </div>
    </div>
  )
}
