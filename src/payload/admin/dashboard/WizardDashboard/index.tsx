'use client'

import { Gutter } from '@payloadcms/ui'
import React, { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import styles from './styles.module.scss'

interface SetupStatus {
  incomeCategories: number
  expenseCategories: number
  payees: number
  accounts: number
  recurringItems: number
}

interface WizardDashboardProps {
  status: SetupStatus
  onRefresh: () => Promise<void>
  onComplete: () => void
}

type StepKey = 'categories' | 'payees' | 'accounts' | 'recurring'

export const WizardDashboard: React.FC<WizardDashboardProps> = ({
  status,
  onRefresh,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<StepKey>('categories')
  const [incomeCategories, setIncomeCategories] = useState<{ id: string; name: string }[]>([])
  const [expenseCategories, setExpenseCategories] = useState<{ id: string; name: string }[]>([])
  const [payees, setPayees] = useState<{ id: string; name: string; description?: string }[]>([])
  const [accounts, setAccounts] = useState<
    { id: string; name: string; accountType: string; startingBalance: number }[]
  >([])
  const [recurringItems, setRecurringItems] = useState<
    { id: string; name: string; itemType: string; amount: number; scheduleType: string }[]
  >([])

  const [showCategoryModal, setShowCategoryModal] = useState<null | 'income' | 'expense'>(null)
  const [editCategory, setEditCategory] = useState<{ id: string; name: string } | null>(null)
  const [showPayeeModal, setShowPayeeModal] = useState(false)
  const [editPayee, setEditPayee] = useState<{ id: string; name: string; description?: string } | null>(null)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [editAccount, setEditAccount] = useState<
    { id: string; name: string; accountType: string; startingBalance: number } | null
  >(null)
  const [showRecurringModal, setShowRecurringModal] = useState(false)
  const [editRecurring, setEditRecurring] = useState<{
    id?: string
    itemType: 'income' | 'expense' | 'transfer'
    name: string
    amount: string
    scheduleType: string
    dayOfWeek?: string
    anchorDate?: string
    dayOfMonth?: string
    month?: string
    incomeCategory?: string
    expenseCategory?: string
    payee?: string
    account?: string
    fromAccount?: string
    toAccount?: string
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const steps = useMemo(
    () => [
      {
        key: 'categories' as StepKey,
        label: 'Categories',
        complete: status.incomeCategories > 0 && status.expenseCategories > 0,
      },
      { key: 'payees' as StepKey, label: 'Payees', complete: status.payees > 0 },
      { key: 'accounts' as StepKey, label: 'Accounts', complete: status.accounts > 0 },
      {
        key: 'recurring' as StepKey,
        label: 'Recurring Items',
        complete: status.recurringItems > 0,
      },
    ],
    [status],
  )

  const currentIndex = steps.findIndex((s) => s.key === currentStep)

  const loadData = async () => {
    const [incomeRes, expenseRes, payeeRes, accountRes, recurringRes] = await Promise.all([
      fetch('/api/income-categories?limit=100&sort=name'),
      fetch('/api/expense-categories?limit=100&sort=name'),
      fetch('/api/payees?limit=100&sort=name'),
      fetch('/api/accounts?limit=100&sort=name'),
      fetch('/api/recurring-items?limit=100&sort=name'),
    ])

    const incomeData = await incomeRes.json()
    const expenseData = await expenseRes.json()
    const payeeData = await payeeRes.json()
    const accountData = await accountRes.json()
    const recurringData = await recurringRes.json()

    setIncomeCategories(incomeData.docs || [])
    setExpenseCategories(expenseData.docs || [])
    setPayees(payeeData.docs || [])
    setAccounts(accountData.docs || [])
    setRecurringItems(recurringData.docs || [])
  }

  const openRecurringModal = async (id?: string) => {
    await loadData()
    if (id) {
      const res = await fetch(`/api/recurring-items/${id}`)
      const data = await res.json()
      const getId = (value?: { id: string } | string | null) =>
        typeof value === 'string' ? value : value?.id || ''

      setEditRecurring({
        id: data.id,
        itemType: data.itemType,
        name: data.name || '',
        amount: String(data.amount ?? ''),
        scheduleType: data.scheduleType || 'monthly',
        dayOfWeek: data.dayOfWeek,
        anchorDate: data.anchorDate ? data.anchorDate.split('T')[0] : undefined,
        dayOfMonth: data.dayOfMonth,
        month: data.month,
        incomeCategory: getId(data.incomeCategory),
        expenseCategory: getId(data.expenseCategory),
        payee: getId(data.payee),
        account: getId(data.account),
        fromAccount: getId(data.fromAccount),
        toAccount: getId(data.toAccount),
      })
    } else {
      setEditRecurring({
        itemType: 'expense',
        name: '',
        amount: '',
        scheduleType: 'monthly',
        dayOfMonth: '1',
        dayOfWeek: '0',
        month: '1',
        anchorDate: new Date().toISOString().split('T')[0],
      })
    }
    setShowRecurringModal(true)
  }

  const normalizeId = (value?: string) => {
    if (!value) return undefined
    return /^\d+$/.test(value) ? Number(value) : value
  }

  useEffect(() => {
    loadData()
  }, [status])

  const stepComplete = (key: StepKey) => steps.find((s) => s.key === key)?.complete ?? false

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].key)
    }
  }

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].key)
    }
  }

  const canCompleteWizard = steps.every((s) => s.complete)

  return (
    <>
    <Gutter>
      <div className={styles.header}>
        <h1 className={styles.title}>Setup Guide</h1>
        <p className={styles.intro}>
          Let&apos;s configure your budget system step by step. Progress saves as you go.
        </p>
      </div>

      <div className={styles.stepper}>
        {steps.map((step, idx) => (
          <React.Fragment key={step.key}>
            <button
              className={`${styles.stepDot} ${
                step.complete ? styles.stepComplete : styles.stepIncomplete
              } ${step.key === currentStep ? styles.stepActive : ''}`}
              onClick={() => setCurrentStep(step.key)}
            >
              {step.complete ? '✓' : idx + 1}
            </button>
            {idx < steps.length - 1 && <div className={styles.stepLine} />}
          </React.Fragment>
        ))}
      </div>
      <div className={styles.stepLabels}>
        {steps.map((step) => (
          <span
            key={step.key}
            className={`${styles.stepLabel} ${step.key === currentStep ? styles.stepLabelActive : ''}`}
          >
            {step.label}
          </span>
        ))}
      </div>

      {currentStep === 'categories' && (
        <div className={styles.stepPanel}>
          <h2 className={styles.sectionTitle}>Step 1: Categories</h2>
          <p className={styles.sectionDesc}>
            We&apos;ve seeded categories to get you started. You can edit or add more here.
          </p>
          <div className={styles.twoColGrid}>
            <div className={styles.card}>
              <div className={styles.cardHeaderRow}>
                <h3>Income Categories</h3>
                <button
                  className="btn btn--style-primary btn--size-small"
                  onClick={() => {
                    setEditCategory(null)
                    setShowCategoryModal('income')
                  }}
                >
                  Add
                </button>
              </div>
              <ul className={styles.list}>
                {incomeCategories.map((cat) => (
                  <li key={cat.id} className={styles.listRow}>
                    <span>{cat.name}</span>
                    <div className={styles.listActions}>
                      <button
                        className="btn btn--style-secondary btn--size-small"
                        onClick={() => {
                          setEditCategory(cat)
                          setShowCategoryModal('income')
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn--style-secondary btn--size-small"
                        onClick={async () => {
                          if (!confirm('Delete this category?')) return
                          await fetch(`/api/income-categories/${cat.id}`, { method: 'DELETE' })
                          await onRefresh()
                          await loadData()
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.card}>
              <div className={styles.cardHeaderRow}>
                <h3>Expense Categories</h3>
                <button
                  className="btn btn--style-primary btn--size-small"
                  onClick={() => {
                    setEditCategory(null)
                    setShowCategoryModal('expense')
                  }}
                >
                  Add
                </button>
              </div>
              <ul className={styles.list}>
                {expenseCategories.map((cat) => (
                  <li key={cat.id} className={styles.listRow}>
                    <span>{cat.name}</span>
                    <div className={styles.listActions}>
                      <button
                        className="btn btn--style-secondary btn--size-small"
                        onClick={() => {
                          setEditCategory(cat)
                          setShowCategoryModal('expense')
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn--style-secondary btn--size-small"
                        onClick={async () => {
                          if (!confirm('Delete this category?')) return
                          await fetch(`/api/expense-categories/${cat.id}`, { method: 'DELETE' })
                          await onRefresh()
                          await loadData()
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {currentStep === 'payees' && (
        <div className={styles.stepPanel}>
          <h2 className={styles.sectionTitle}>Step 2: Payees</h2>
          <p className={styles.sectionDesc}>
            Add the people or companies you pay or get paid by.
          </p>
          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <h3>Payees</h3>
              <button className="btn btn--style-primary btn--size-small" onClick={() => setShowPayeeModal(true)}>
                Add
              </button>
            </div>
            <ul className={styles.list}>
              {payees.map((payee) => (
                <li key={payee.id} className={styles.listRow}>
                  <div>
                    <div>{payee.name}</div>
                    {payee.description && <div className={styles.listMuted}>{payee.description}</div>}
                  </div>
                  <div className={styles.listActions}>
                    <button
                      className="btn btn--style-secondary btn--size-small"
                      onClick={() => {
                        setEditPayee(payee)
                        setShowPayeeModal(true)
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn--style-secondary btn--size-small"
                      onClick={async () => {
                        if (!confirm('Delete this payee?')) return
                        await fetch(`/api/payees/${payee.id}`, { method: 'DELETE' })
                        await onRefresh()
                        await loadData()
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {currentStep === 'accounts' && (
        <div className={styles.stepPanel}>
          <h2 className={styles.sectionTitle}>Step 3: Accounts</h2>
          <p className={styles.sectionDesc}>
            Add the accounts you want to track in your budget.
          </p>
          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <h3>Accounts</h3>
              <button className="btn btn--style-primary btn--size-small" onClick={() => setShowAccountModal(true)}>
                Add
              </button>
            </div>
            <ul className={styles.list}>
              {accounts.map((account) => (
                <li key={account.id} className={styles.listRow}>
                  <div>
                    <div>{account.name}</div>
                    <div className={styles.listMuted}>{account.accountType}</div>
                  </div>
                  <div className={styles.listActions}>
                    <button
                      className="btn btn--style-secondary btn--size-small"
                      onClick={() => {
                        setEditAccount(account)
                        setShowAccountModal(true)
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn--style-secondary btn--size-small"
                      onClick={async () => {
                        if (!confirm('Delete this account?')) return
                        await fetch(`/api/accounts/${account.id}`, { method: 'DELETE' })
                        await onRefresh()
                        await loadData()
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {currentStep === 'recurring' && (
        <div className={styles.stepPanel}>
          <h2 className={styles.sectionTitle}>Step 4: Recurring Items</h2>
          <p className={styles.sectionDesc}>
            Add your recurring income, expenses, and transfers.
          </p>
          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <h3>Recurring Items</h3>
              <button
                className="btn btn--style-primary btn--size-small"
                onClick={() => openRecurringModal()}
              >
                Add
              </button>
            </div>
            <ul className={styles.list}>
              {recurringItems.map((item) => (
                <li key={item.id} className={styles.listRow}>
                  <div>
                    <div>{item.name}</div>
                    <div className={styles.listMuted}>
                      {item.itemType} • {item.scheduleType}
                    </div>
                  </div>
                  <div className={styles.listActions}>
                    <button
                      className="btn btn--style-secondary btn--size-small"
                      onClick={() => openRecurringModal(item.id)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn--style-secondary btn--size-small"
                      onClick={async () => {
                        if (!confirm('Delete this recurring item?')) return
                        await fetch(`/api/recurring-items/${item.id}`, { method: 'DELETE' })
                        await onRefresh()
                        await loadData()
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className={styles.wizardFooter}>
        <button
          className="btn btn--style-secondary"
          onClick={handleBack}
          disabled={currentIndex === 0}
        >
          Back
        </button>
        <div className={styles.footerStatus}>
          {steps.map((step) => (
            <span
              key={step.key}
              className={`${styles.footerBadge} ${step.complete ? styles.footerComplete : styles.footerIncomplete}`}
            >
              {step.label}
            </span>
          ))}
        </div>
        {currentIndex < steps.length - 1 ? (
          <button
            className="btn btn--style-primary"
            onClick={handleNext}
            disabled={!stepComplete(currentStep)}
          >
            Next
          </button>
        ) : (
          <button className="btn btn--style-primary" onClick={onComplete} disabled={!canCompleteWizard}>
            Complete Setup →
          </button>
        )}
      </div>

      {/* Modals */}
      {showCategoryModal && (
        <Modal
          title={`${editCategory ? 'Edit' : 'Add'} ${showCategoryModal === 'income' ? 'Income' : 'Expense'} Category`}
          onClose={() => setShowCategoryModal(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (submitting) return
              setSubmitting(true)
              const form = e.target as HTMLFormElement
              const name = (form.elements.namedItem('name') as HTMLInputElement).value
              try {
                if (editCategory) {
                  await fetch(`/api/${showCategoryModal}-categories/${editCategory.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name }),
                  })
                } else {
                  await fetch(`/api/${showCategoryModal}-categories`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name }),
                  })
                }
                form.reset()
                setShowCategoryModal(null)
                setEditCategory(null)
                await onRefresh()
                await loadData()
              } catch (err) {
                console.error(err)
                alert('Failed to save category.')
              } finally {
                setSubmitting(false)
              }
            }}
          >
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className="field-type text">
                  <label className="field-label">Name</label>
                  <input className="field-input" name="name" defaultValue={editCategory?.name || ''} required />
                </div>
              </div>
            </div>
            <div className={styles.formActions}>
              <button
                type="button"
                className="btn btn--style-secondary"
                onClick={() => setShowCategoryModal(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn--style-primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showPayeeModal && (
        <Modal title={`${editPayee ? 'Edit' : 'Add'} Payee`} onClose={() => setShowPayeeModal(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (submitting) return
              setSubmitting(true)
              const form = e.target as HTMLFormElement
              const name = (form.elements.namedItem('name') as HTMLInputElement).value
              const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value

              try {
                if (editPayee) {
                  await fetch(`/api/payees/${editPayee.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, description }),
                  })
                } else {
                  await fetch('/api/payees', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, description }),
                  })
                }
                form.reset()
                setShowPayeeModal(false)
                setEditPayee(null)
                await onRefresh()
                await loadData()
              } catch (err) {
                console.error(err)
                alert('Failed to save payee.')
              } finally {
                setSubmitting(false)
              }
            }}
          >
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className="field-type text">
                    <label className="field-label">Name</label>
                    <input className="field-input" name="name" defaultValue={editPayee?.name || ''} required />
                  </div>
                </div>
                <div className="field-type textarea" style={{ marginBottom: '1.5rem' }}>
                  <label className="field-label">Description</label>
                  <textarea className="field-input" name="description" defaultValue={editPayee?.description || ''} rows={3} />
                </div>
              </div>
              <div className={styles.formActions}>
                <button
                  type="button"
                  className="btn btn--style-secondary"
                  onClick={() => setShowPayeeModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn--style-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Payee'}
                </button>
              </div>
            </form>
          </Modal>
      )}

      {showAccountModal && (
        <Modal title={`${editAccount ? 'Edit' : 'Add'} Account`} onClose={() => setShowAccountModal(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (submitting) return
              setSubmitting(true)
              const form = e.target as HTMLFormElement
              const name = (form.elements.namedItem('name') as HTMLInputElement).value
              const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value
              const accountTypeValue = (form.elements.namedItem('accountType') as HTMLSelectElement).value
              const startingBalanceValue = (form.elements.namedItem('startingBalance') as HTMLInputElement).value

              try {
                const starting = parseFloat(startingBalanceValue || '0')
                if (editAccount) {
                  await fetch(`/api/accounts/${editAccount.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name,
                      description,
                      accountType: accountTypeValue,
                      startingBalance: starting,
                      currentBalance: starting,
                    }),
                  })
                } else {
                  await fetch('/api/accounts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name,
                      description,
                      accountType: accountTypeValue,
                      startingBalance: starting,
                      currentBalance: starting,
                    }),
                  })
                }
                form.reset()
                setShowAccountModal(false)
                setEditAccount(null)
                await onRefresh()
                await loadData()
              } catch (err) {
                console.error(err)
                alert('Failed to save account.')
              } finally {
                setSubmitting(false)
              }
            }}
          >
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <div className="field-type text">
                    <label className="field-label">Name</label>
                    <input className="field-input" name="name" defaultValue={editAccount?.name || ''} required />
                  </div>
                  <div className="field-type select">
                    <label className="field-label">Account Type</label>
                    <div className="select-container">
                      <select
                        className="field-input"
                        name="accountType"
                        defaultValue={editAccount?.accountType || 'checking'}
                        required
                      >
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                        <option value="credit_card">Credit Card</option>
                        <option value="cash">Cash</option>
                        <option value="investment">Investment</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className={styles.formGrid}>
                  <div className="field-type number">
                    <label className="field-label">Starting Balance</label>
                    <input
                      className="field-input"
                      name="startingBalance"
                      type="number"
                      step="0.01"
                      defaultValue={editAccount?.startingBalance ?? 0}
                      required
                    />
                  </div>
                  <div className="field-type textarea">
                    <label className="field-label">Description</label>
                    <textarea className="field-input" name="description" rows={2} />
                  </div>
                </div>
              </div>
              <div className={styles.formActions}>
                <button
                  type="button"
                  className="btn btn--style-secondary"
                  onClick={() => setShowAccountModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn--style-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </form>
          </Modal>
      )}

      {showRecurringModal && editRecurring && (
        <Modal
          title={`${editRecurring.id ? 'Edit' : 'Add'} Recurring Item`}
          onClose={() => setShowRecurringModal(false)}
          size="lg"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (submitting) return
              setSubmitting(true)

                try {
                  if (editRecurring.itemType === 'income') {
                    if (!editRecurring.incomeCategory || !editRecurring.payee || !editRecurring.account) {
                      throw new Error('Income items require Income Category, Payee, and Account.')
                    }
                    if (
                      !incomeCategories.some((cat) => String(cat.id) === String(editRecurring.incomeCategory)) ||
                      !payees.some((p) => String(p.id) === String(editRecurring.payee)) ||
                      !accounts.some((a) => String(a.id) === String(editRecurring.account))
                    ) {
                      throw new Error('Please select valid Income Category, Payee, and Account.')
                    }
                  }
                  if (editRecurring.itemType === 'expense') {
                    if (!editRecurring.expenseCategory || !editRecurring.payee || !editRecurring.account) {
                      throw new Error('Expense items require Expense Category, Payee, and Account.')
                    }
                    if (
                      !expenseCategories.some((cat) => String(cat.id) === String(editRecurring.expenseCategory)) ||
                      !payees.some((p) => String(p.id) === String(editRecurring.payee)) ||
                      !accounts.some((a) => String(a.id) === String(editRecurring.account))
                    ) {
                      throw new Error('Please select valid Expense Category, Payee, and Account.')
                    }
                  }
                  if (editRecurring.itemType === 'transfer') {
                    if (!editRecurring.fromAccount || !editRecurring.toAccount) {
                      throw new Error('Transfer items require From Account and To Account.')
                    }
                    if (
                      !accounts.some((a) => String(a.id) === String(editRecurring.fromAccount)) ||
                      !accounts.some((a) => String(a.id) === String(editRecurring.toAccount))
                    ) {
                      throw new Error('Please select valid From and To accounts.')
                    }
                  }

                  const payload = {
                    itemType: editRecurring.itemType,
                    name: editRecurring.name,
                    amount: parseFloat(editRecurring.amount || '0'),
                    scheduleType: editRecurring.scheduleType,
                    dayOfWeek: editRecurring.dayOfWeek,
                    anchorDate: editRecurring.anchorDate
                      ? new Date(editRecurring.anchorDate).toISOString()
                      : undefined,
                    dayOfMonth: editRecurring.dayOfMonth,
                    month: editRecurring.month,
                    incomeCategory: normalizeId(editRecurring.incomeCategory),
                    expenseCategory: normalizeId(editRecurring.expenseCategory),
                    payee: normalizeId(editRecurring.payee),
                    account: normalizeId(editRecurring.account),
                    fromAccount: normalizeId(editRecurring.fromAccount),
                    toAccount: normalizeId(editRecurring.toAccount),
                    isActive: true,
                  }

                  if (editRecurring.id) {
                    await fetch(`/api/recurring-items/${editRecurring.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload),
                    })
                  } else {
                    await fetch('/api/recurring-items', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload),
                    })
                  }
                  setShowRecurringModal(false)
                  setEditRecurring(null)
                  await onRefresh()
                  await loadData()
                } catch (err) {
                  console.error(err)
                  alert(err instanceof Error ? err.message : 'Failed to save recurring item.')
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              <div className={styles.modalBody}>
                <div className={styles.formSection}>
                  <h4 className={styles.formSectionTitle}>Basics</h4>
                  <div className={styles.formGridSingle}>
                    <div className="field-type text">
                      <label className="field-label">Name</label>
                      <input
                        className="field-input"
                        value={editRecurring.name}
                        onChange={(e) => setEditRecurring({ ...editRecurring, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="field-type number">
                      <label className="field-label">Amount</label>
                      <input
                        className="field-input"
                        type="number"
                        step="0.01"
                        value={editRecurring.amount}
                        onChange={(e) => setEditRecurring({ ...editRecurring, amount: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.formSection}>
                  <h4 className={styles.formSectionTitle}>Details</h4>
                  <div className={styles.formGridSingle}>
                    <div className="field-type select">
                      <label className="field-label">Type</label>
                      <div className="select-container">
                        <select
                          className="field-input"
                          value={editRecurring.itemType}
                          onChange={(e) =>
                            setEditRecurring({
                              ...editRecurring,
                              itemType: e.target.value as 'income' | 'expense' | 'transfer',
                              incomeCategory: '',
                              expenseCategory: '',
                              payee: '',
                              account: '',
                              fromAccount: '',
                              toAccount: '',
                            })
                          }
                        >
                          <option value="income">Income</option>
                          <option value="expense">Expense</option>
                          <option value="transfer">Transfer</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {editRecurring.itemType === 'income' && (
                    <div className={styles.formGridSingle}>
                      <div className="field-type select">
                        <label className="field-label">Income Category</label>
                        <div className="select-container">
                          <select
                            className="field-input"
                            value={editRecurring.incomeCategory || ''}
                            onChange={(e) => setEditRecurring({ ...editRecurring, incomeCategory: e.target.value })}
                            required
                          >
                            <option value="">Select...</option>
                            {incomeCategories.map((cat) => (
                              <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="field-type select">
                        <label className="field-label">Payee</label>
                        <div className="select-container">
                          <select
                            className="field-input"
                            value={editRecurring.payee || ''}
                            onChange={(e) => setEditRecurring({ ...editRecurring, payee: e.target.value })}
                            required
                          >
                            <option value="">Select...</option>
                            {payees.map((payee) => (
                              <option key={payee.id} value={String(payee.id)}>{payee.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="field-type select">
                        <label className="field-label">Account</label>
                        <div className="select-container">
                          <select
                            className="field-input"
                            value={editRecurring.account || ''}
                            onChange={(e) => setEditRecurring({ ...editRecurring, account: e.target.value })}
                            required
                          >
                            <option value="">Select...</option>
                            {accounts.map((account) => (
                              <option key={account.id} value={String(account.id)}>{account.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {editRecurring.itemType === 'expense' && (
                    <div className={styles.formGridSingle}>
                      <div className="field-type select">
                        <label className="field-label">Expense Category</label>
                        <div className="select-container">
                          <select
                            className="field-input"
                            value={editRecurring.expenseCategory || ''}
                            onChange={(e) => setEditRecurring({ ...editRecurring, expenseCategory: e.target.value })}
                            required
                          >
                            <option value="">Select...</option>
                            {expenseCategories.map((cat) => (
                              <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="field-type select">
                        <label className="field-label">Payee</label>
                        <div className="select-container">
                          <select
                            className="field-input"
                            value={editRecurring.payee || ''}
                            onChange={(e) => setEditRecurring({ ...editRecurring, payee: e.target.value })}
                            required
                          >
                            <option value="">Select...</option>
                            {payees.map((payee) => (
                              <option key={payee.id} value={String(payee.id)}>{payee.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="field-type select">
                        <label className="field-label">Account</label>
                        <div className="select-container">
                          <select
                            className="field-input"
                            value={editRecurring.account || ''}
                            onChange={(e) => setEditRecurring({ ...editRecurring, account: e.target.value })}
                            required
                          >
                            <option value="">Select...</option>
                            {accounts.map((account) => (
                              <option key={account.id} value={String(account.id)}>{account.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {editRecurring.itemType === 'transfer' && (
                    <div className={styles.formGridSingle}>
                      <div className="field-type select">
                        <label className="field-label">From Account</label>
                        <div className="select-container">
                          <select
                            className="field-input"
                            value={editRecurring.fromAccount || ''}
                            onChange={(e) => setEditRecurring({ ...editRecurring, fromAccount: e.target.value })}
                            required
                          >
                            <option value="">Select...</option>
                            {accounts.map((account) => (
                              <option key={account.id} value={String(account.id)}>{account.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="field-type select">
                        <label className="field-label">To Account</label>
                        <div className="select-container">
                          <select
                            className="field-input"
                            value={editRecurring.toAccount || ''}
                            onChange={(e) => setEditRecurring({ ...editRecurring, toAccount: e.target.value })}
                            required
                          >
                            <option value="">Select...</option>
                            {accounts.map((account) => (
                              <option key={account.id} value={String(account.id)}>{account.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.formSection}>
                  <h4 className={styles.formSectionTitle}>Schedule</h4>
                  <div className={styles.formGridSingle}>
                    <div className="field-type select">
                      <label className="field-label">Schedule</label>
                      <div className="select-container">
                        <select
                          className="field-input"
                          value={editRecurring.scheduleType}
                          onChange={(e) => {
                            const nextType = e.target.value
                            setEditRecurring({
                              ...editRecurring,
                              scheduleType: nextType,
                              dayOfWeek:
                                nextType === 'weekly' || nextType === 'biweekly'
                                  ? editRecurring.dayOfWeek || '0'
                                  : editRecurring.dayOfWeek,
                              anchorDate:
                                nextType === 'biweekly' || nextType === 'quarterly' || nextType === 'semiannually'
                                  ? editRecurring.anchorDate || new Date().toISOString().split('T')[0]
                                  : editRecurring.anchorDate,
                              dayOfMonth:
                                nextType === 'monthly' || nextType === 'annually'
                                  ? editRecurring.dayOfMonth || '1'
                                  : editRecurring.dayOfMonth,
                              month:
                                nextType === 'annually' ? editRecurring.month || '1' : editRecurring.month,
                            })
                          }}
                        >
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Bi-weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="bimonthly_1_15">Bi-monthly (1st/15th)</option>
                          <option value="bimonthly_15_last">Bi-monthly (15th/last)</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="semiannually">Semi-annually</option>
                          <option value="annually">Annually</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {(editRecurring.scheduleType === 'weekly' || editRecurring.scheduleType === 'biweekly') && (
                    <div className={styles.formGridSingle}>
                      <div className="field-type select">
                        <label className="field-label">Day of Week</label>
                        <div className="select-container">
                          <select
                            className="field-input"
                            value={editRecurring.dayOfWeek || '0'}
                            onChange={(e) => setEditRecurring({ ...editRecurring, dayOfWeek: e.target.value })}
                          >
                            <option value="0">Sunday</option>
                            <option value="1">Monday</option>
                            <option value="2">Tuesday</option>
                            <option value="3">Wednesday</option>
                            <option value="4">Thursday</option>
                            <option value="5">Friday</option>
                            <option value="6">Saturday</option>
                          </select>
                        </div>
                      </div>
                      {editRecurring.scheduleType === 'biweekly' && (
                        <div className="field-type date">
                          <label className="field-label">Anchor Date</label>
                          <input
                            className="field-input"
                            type="date"
                            value={editRecurring.anchorDate || ''}
                            onChange={(e) => setEditRecurring({ ...editRecurring, anchorDate: e.target.value })}
                            required
                          />
                        </div>
                      )}
                  </div>
                )}

                  {editRecurring.scheduleType === 'monthly' && (
                    <div className={styles.formGridSingle}>
                      <div className="field-type select">
                        <label className="field-label">Day of Month</label>
                        <div className="select-container">
                          <select
                            className="field-input"
                            value={editRecurring.dayOfMonth || '1'}
                            onChange={(e) => setEditRecurring({ ...editRecurring, dayOfMonth: e.target.value })}
                          >
                            {Array.from({ length: 30 }, (_, i) => (
                              <option key={i + 1} value={`${i + 1}`}>{i + 1}</option>
                            ))}
                            <option value="last">Last day</option>
                          </select>
                        </div>
                      </div>
                  </div>
                )}

                  {(editRecurring.scheduleType === 'quarterly' || editRecurring.scheduleType === 'semiannually') && (
                    <div className={styles.formGridSingle}>
                      <div className="field-type date">
                        <label className="field-label">Anchor Date</label>
                        <input
                          className="field-input"
                          type="date"
                          value={editRecurring.anchorDate || ''}
                          onChange={(e) => setEditRecurring({ ...editRecurring, anchorDate: e.target.value })}
                          required
                        />
                      </div>
                  </div>
                )}

                  {editRecurring.scheduleType === 'annually' && (
                    <div className={styles.formGridSingle}>
                      <div className="field-type select">
                        <label className="field-label">Month</label>
                        <div className="select-container">
                          <select
                            className="field-input"
                            value={editRecurring.month || '1'}
                            onChange={(e) => setEditRecurring({ ...editRecurring, month: e.target.value })}
                          >
                            {[
                              'January',
                              'February',
                              'March',
                              'April',
                              'May',
                              'June',
                              'July',
                              'August',
                              'September',
                              'October',
                              'November',
                              'December',
                            ].map((label, idx) => (
                              <option key={label} value={`${idx + 1}`}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="field-type select">
                        <label className="field-label">Day of Month</label>
                        <div className="select-container">
                          <select
                            className="field-input"
                            value={editRecurring.dayOfMonth || '1'}
                            onChange={(e) => setEditRecurring({ ...editRecurring, dayOfMonth: e.target.value })}
                          >
                            {Array.from({ length: 30 }, (_, i) => (
                              <option key={i + 1} value={`${i + 1}`}>{i + 1}</option>
                            ))}
                            <option value="last">Last day</option>
                          </select>
                        </div>
                      </div>
                  </div>
                )}
                </div>
              </div>
              <div className={styles.formActions}>
                <button
                  type="button"
                  className="btn btn--style-secondary"
                  onClick={() => setShowRecurringModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn--style-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Recurring Item'}
                </button>
              </div>
            </form>
          </Modal>
      )}
    </Gutter>
    </>
  )
}
