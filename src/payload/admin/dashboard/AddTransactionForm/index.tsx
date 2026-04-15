'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/shared/ui/Modal'
import styles from './styles.module.scss'

interface AddTransactionFormProps {
  accountId: string
  onSuccess: () => void
  onCancel: () => void
}

export const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ accountId, onSuccess, onCancel }) => {
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | 'transfer'>('expense')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [payeeName, setPayeeName] = useState('')
  const [toAccountId, setToAccountId] = useState('')

  // Data state
  const [incomeCategories, setIncomeCategories] = useState<{id: string, name: string}[]>([])
  const [expenseCategories, setExpenseCategories] = useState<{id: string, name: string}[]>([])
  const [payees, setPayees] = useState<{id: string, name: string}[]>([])
  const [accounts, setAccounts] = useState<{id: string, name: string}[]>([])

  // Fetch options on mount
  useEffect(() => {
    const fetchOptions = async () => {
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
  }, [])

  // Fetch accounts for transfer options
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch('/api/accounts?limit=200&sort=name')
        const data = await res.json()
        setAccounts(data.docs || [])
      } catch (e) {
        console.error("Failed to load options", e)
      }
    }
    fetchAccounts()
  }, [])

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

      // Optimistically update local list
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

  // Format dates for input min/max (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0]

  return (
    <Modal title="Add Transaction" onClose={onCancel} size="lg">
      
      {loadingOptions && (
         <div className={styles.loadingText}>Loading options...</div>
      )}

      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setIsSubmitting(true)
          const form = e.target as HTMLFormElement
          
          const formData = {
            date: (form.elements.namedItem('date') as HTMLInputElement).value,
            amount: (form.elements.namedItem('amount') as HTMLInputElement).value,
            description: (form.elements.namedItem('description') as HTMLInputElement).value,
            notes: (form.elements.namedItem('notes') as HTMLTextAreaElement).value,
          }

          try {
             // Resolve Category
             let categoryId: string | null = null
             if (transactionType !== 'transfer' && categoryName) {
               categoryId = await ensureEntity(
                 categoryName,
                 transactionType === 'income' ? 'income-categories' : 'expense-categories',
                 transactionType === 'income' ? incomeCategories : expenseCategories
               )
             }

             // Resolve Payee
             let payeeId: string | null = null
             if (transactionType !== 'transfer' && payeeName) {
                payeeId = await ensureEntity(payeeName, 'payees', payees)
             }

             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             const reqBody: any = {
               date: new Date(formData.date).toISOString(),
               account: accountId,
               type: transactionType,
               amount: parseFloat(formData.amount),
               description: formData.description,
               notes: formData.notes,
             }

             // Add details based on type
             if (transactionType === 'income') {
               reqBody.incomeDetails = {
                 category: categoryId,
                 payee: payeeId
               }
             } else if (transactionType === 'expense') {
               reqBody.expenseDetails = {
                 category: categoryId,
                 payee: payeeId
               }
             } else if (transactionType === 'transfer') {
               if (!toAccountId || toAccountId === accountId) {
                 throw new Error('Please select a different destination account')
               }
               reqBody.transferDetails = {
                 toAccount: toAccountId
               }
             }

             const response = await fetch('/api/transactions', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(reqBody),
             })

             if (!response.ok) throw new Error('Failed to create transaction')

             // Reset and refresh
             form.reset()
             setTransactionType('expense') // Reset to default
             setCategoryName('')
             setPayeeName('')
             setToAccountId('')
             onSuccess()

          } catch (error) {
            console.error('Error creating transaction:', error)
            alert('Failed to create transaction')
          } finally {
            setIsSubmitting(false)
          }
        }}
      >
        <div className={styles.formGrid}>
          <div className="field-type date">
            <label className="field-label">Date</label>
            <input
              className="field-input"
              type="date"
              name="date"
              required
              defaultValue={today}
            />
          </div>
          <div className="field-type select">
            <label className="field-label">Type</label>
            <div className="select-container">
            <select
              className="field-input"
              name="type"
              value={transactionType}
              onChange={(e) => {
                setTransactionType(e.target.value as 'income' | 'expense' | 'transfer')
                setCategoryName('')
                setPayeeName('')
                setToAccountId('')
              }}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
            </div>
          </div>
        </div>

        {transactionType !== 'transfer' && (
          <div className={styles.formGrid}>
             <div className="field-type text">
                <label className="field-label">Category</label>
                <input
                  className="field-input"
                  type="text"
                  name="categoryName"
                  placeholder="Select or type new..."
                  autoComplete="off"
                  style={{ width: '100%' }}
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                />
                <div className={styles.inlineSelect}>
                  <label className={styles.inlineLabel}>Pick existing</label>
                  <div className="select-container">
                    <select
                      className="field-input"
                      value=""
                      onChange={(e) => setCategoryName(e.target.value)}
                    >
                      <option value="">Select...</option>
                      {(transactionType === 'income' ? incomeCategories : expenseCategories).map(cat => (
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
                  style={{ width: '100%' }}
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                />
                <div className={styles.inlineSelect}>
                  <label className={styles.inlineLabel}>Pick existing</label>
                  <div className="select-container">
                    <select
                      className="field-input"
                      value=""
                      onChange={(e) => setPayeeName(e.target.value)}
                    >
                      <option value="">Select...</option>
                      {payees.map(payee => (
                        <option key={payee.id} value={payee.name}>{payee.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
            </div>
          </div>
        )}

        {transactionType === 'transfer' && (
          <div className={styles.fieldGroup}>
             <div className="field-type select">
                <label className="field-label">To Account</label>
                <div className="select-container">
                  <select
                    className="field-input"
                    name="toAccountId"
                    required
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                  >
                    <option value="">Select destination...</option>
                    {accounts
                      .filter((acct) => acct.id !== accountId)
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

        <div className={styles.fieldGroup}>
           <div className="field-type text">
             <label className="field-label">Description</label>
             <input
               className="field-input"
               type="text"
               name="description"
               required
               placeholder={transactionType === 'transfer' ? 'e.g. Transfer to Savings' : 'e.g. Groceries, Dining Out'}
             />
           </div>
        </div>

        <div className={styles.fieldGroup}>
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

        <div className={styles.fieldGroup}>
           <div className="field-type textarea">
             <label className="field-label">Notes</label>
             <textarea
               className="field-input"
               name="notes"
               rows={2}
             />
           </div>
        </div>

        <div className={styles.formActions}>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn--style-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn--style-primary"
          >
            {isSubmitting ? 'Saving...' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
