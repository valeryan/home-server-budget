import { Gutter } from '@payloadcms/ui'
import Link from 'next/link'
import React, { useCallback, useEffect, useState } from 'react'
import { AddTransactionForm } from '@/payload/admin/dashboard/AddTransactionForm'
import { BudgetItemsList } from '@/payload/admin/dashboard/BudgetItemsList'
import { BudgetSummaryCard } from '@/payload/admin/dashboard/BudgetSummaryCard'
import { CategorySummary } from '@/payload/admin/dashboard/CategorySummary'
import { TransactionTable } from '@/payload/admin/dashboard/TransactionTable'
import type { BudgetAutomation, Budget, BudgetProjection } from '@/domain/budgets/types'
import { formatDate } from '@/shared/formatting'
import styles from './styles.module.scss'

interface BudgetDashboardProps {
  automations: BudgetAutomation[]
}

export const BudgetDashboard: React.FC<BudgetDashboardProps> = ({ automations }) => {
  const [currentAutomationIndex, setCurrentAutomationIndex] = useState(0)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null)
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const [projections, setProjections] = useState<BudgetProjection | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showStalePrompt, setShowStalePrompt] = useState(false)
  const [staleBudgetId, setStaleBudgetId] = useState<string | null>(null)
  const [dismissedStaleBudgetId, setDismissedStaleBudgetId] = useState<string | null>(null)
  const [autoAdvanceInProgress, setAutoAdvanceInProgress] = useState(false)
  const [finalizeInProgress, setFinalizeInProgress] = useState(false)
  const [initialAutoAdvanceAttempted, setInitialAutoAdvanceAttempted] = useState(false)

  const currentAutomation = automations[currentAutomationIndex]
  const currentAccount = currentAutomation?.account

  const fetchBudgets = useCallback(async () => {
    if (!currentAccount) return

    try {
      const response = await fetch(
        `/api/budgets?where[account][equals]=${currentAccount.id}&sort=startDate&limit=100`,
      )
      const data = await response.json()
      const budgetDocs = data.docs || []
      setBudgets(budgetDocs)

      if (budgetDocs.length === 0 && !initialAutoAdvanceAttempted) {
        setInitialAutoAdvanceAttempted(true)
        try {
          await fetch(`/api/budget-auto-advance?account=${currentAccount.id}`)
          const retryResponse = await fetch(
            `/api/budgets?where[account][equals]=${currentAccount.id}&sort=startDate&limit=100`,
          )
          const retryData = await retryResponse.json()
          const retryDocs = retryData.docs || []
          setBudgets(retryDocs)

          const active = retryDocs.find((b: Budget) => b.status === 'active')
          if (active) {
            setSelectedBudgetId(active.id)
          } else if (retryDocs.length > 0) {
            setSelectedBudgetId(retryDocs[retryDocs.length - 1].id)
          }
          return
        } catch (error) {
          console.error('Error auto-creating initial budgets:', error)
        }
      }

      if (!selectedBudgetId) {
        const active = budgetDocs.find((b: Budget) => b.status === 'active')
        if (active) {
          setSelectedBudgetId(active.id)
        } else if (budgetDocs.length > 0) {
          setSelectedBudgetId(budgetDocs[budgetDocs.length - 1].id)
        }
      }
    } catch (error) {
      console.error('Error fetching budgets:', error)
    }
  }, [currentAccount, initialAutoAdvanceAttempted, selectedBudgetId])

  const fetchSelectedBudget = useCallback(
    async (options?: { autoAdvance?: boolean }) => {
      if (!currentAccount || !selectedBudgetId) return

      setLoading(true)

      try {
        if (options?.autoAdvance) {
          await fetch(`/api/budget-auto-advance?account=${currentAccount.id}`)
        }

        const response = await fetch(`/api/budgets/${selectedBudgetId}`)
        const budget = await response.json()
        setSelectedBudget(budget)

        if (budget?.endDate && budget?.status === 'active') {
          const endDate = new Date(budget.endDate)
          endDate.setHours(0, 0, 0, 0)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const isStale = endDate < today

          if (isStale && dismissedStaleBudgetId !== budget.id) {
            setStaleBudgetId(budget.id)
            setShowStalePrompt(true)
          }
        }

        if (budget) {
          const projResponse = await fetch(
            `/api/budget-projections?startDate=${budget.startDate}&endDate=${budget.endDate}&account=${currentAccount.id}&budgetId=${budget.id}`,
          )
          const projData = await projResponse.json()
          setProjections(projData)
        } else {
          setProjections(null)
        }
      } catch (error) {
        console.error('Error fetching budget:', error)
        setSelectedBudget(null)
        setProjections(null)
      } finally {
        setLoading(false)
      }
    },
    [currentAccount, dismissedStaleBudgetId, selectedBudgetId],
  )

  useEffect(() => {
    fetchBudgets()
  }, [fetchBudgets])

  useEffect(() => {
    fetchSelectedBudget({ autoAdvance: false })
  }, [fetchSelectedBudget])

  const handlePrevAutomation = () => {
    setCurrentAutomationIndex((prev) => (prev > 0 ? prev - 1 : automations.length - 1))
  }

  const handleNextAutomation = () => {
    setCurrentAutomationIndex((prev) => (prev < automations.length - 1 ? prev + 1 : 0))
  }

  useEffect(() => {
    setShowStalePrompt(false)
    setStaleBudgetId(null)
    setDismissedStaleBudgetId(null)
    setSelectedBudgetId(null)
    setSelectedBudget(null)
    setBudgets([])
    setInitialAutoAdvanceAttempted(false)
  }, [currentAccount?.id])

  const handleProceedAutoAdvance = async () => {
    if (!currentAccount) return
    setAutoAdvanceInProgress(true)
    setShowStalePrompt(false)
    setDismissedStaleBudgetId(null)

    try {
      await fetch(`/api/budget-auto-advance?account=${currentAccount.id}`)
      setSelectedBudgetId(null)
      await fetchBudgets()
    } catch (error) {
      console.error('Error auto-advancing budgets:', error)
    } finally {
      setAutoAdvanceInProgress(false)
      setStaleBudgetId(null)
    }
  }

  const handleWaitAutoAdvance = () => {
    setShowStalePrompt(false)
    if (staleBudgetId) {
      setDismissedStaleBudgetId(staleBudgetId)
    }
  }

  const handleFinalizeBudget = async () => {
    if (!selectedBudget || !currentAccount) return

    const confirmed = window.confirm(
      'Finalize this budget now? This will close the current budget and create the next budget(s) based on your schedule.',
    )
    if (!confirmed) return

    setFinalizeInProgress(true)

    try {
      const response = await fetch(`/api/budgets/${selectedBudget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })

      if (!response.ok) {
        throw new Error('Failed to close budget')
      }

      await fetch(`/api/budget-auto-advance?account=${currentAccount.id}`)
      setSelectedBudgetId(null)
      await fetchBudgets()
    } catch (error) {
      console.error('Error finalizing budget:', error)
      alert('Failed to finalize budget. Please try again.')
    } finally {
      setFinalizeInProgress(false)
    }
  }

  if (automations.length === 0) {
    return (
      <Gutter>
        <h1 className={styles.noAutomationHeader}>Budget Dashboard</h1>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>⚙️</div>
          <h2 className={styles.emptyStateTitle}>No Budget Automations</h2>
          <p className={styles.emptyStateText}>
            Create a budget automation to automatically manage budget periods for your accounts.
          </p>
          <Link
            href="/admin/collections/budget-schedules/create"
            className="btn btn--style-primary"
          >
            Create Budget Automation
          </Link>
        </div>
      </Gutter>
    )
  }

  return (
    <Gutter>
      <div className={styles.dashboardContent}>
        {showStalePrompt && (
          <div className={styles.stalePrompt}>
            <div>
              <h3 className={styles.stalePromptTitle}>Budget Period Ended</h3>
              <p className={styles.stalePromptMessage}>
                Your current budget is past its end date. Proceeding will close it and open the
                next budget period automatically.
              </p>
            </div>
            <div className={styles.stalePromptActions}>
              <button
                className="btn btn--style-secondary btn--size-small"
                onClick={handleWaitAutoAdvance}
                disabled={autoAdvanceInProgress}
              >
                Wait
              </button>
              <button
                className="btn btn--style-primary btn--size-small"
                onClick={handleProceedAutoAdvance}
                disabled={autoAdvanceInProgress}
              >
                {autoAdvanceInProgress ? 'Processing...' : 'Proceed'}
              </button>
            </div>
          </div>
        )}
        <div className={styles.header}>
            <div>
                 <h1 className={styles.title}>Budget Dashboard</h1>
                 <p className={styles.subtitle}>Overview for {currentAccount.name}</p>
            </div>
            
            {/* Quick Actions / Navigation */}
             <div className={styles.actions}>
                 {automations.length > 1 && (
                     <div className={styles.pagination}>
                        <button onClick={handlePrevAutomation} className={styles.paginationButton}>◀</button>
                         <span className={styles.paginationText}>{currentAutomationIndex + 1}/{automations.length}</span>
                        <button onClick={handleNextAutomation} className={styles.paginationButton}>▶</button>
                     </div>
                 )}
                 {selectedBudget && (
                   <button
                     onClick={handleFinalizeBudget}
                     className="btn btn--style-secondary btn--size-small"
                     disabled={finalizeInProgress}
                   >
                     {finalizeInProgress ? 'Finalizing...' : 'Finalize Budget'}
                   </button>
                 )}
                  <Link href="/admin/collections/recurring-items" className="btn btn--style-secondary btn--size-small">Recurring Items</Link>
             </div>
         </div>


        {/* Active Budget Display */}
        {loading ? (
          <p className={styles.loading}>Loading budget...</p>
        ) : selectedBudget && projections ? (
          <>
             {(() => {
               const idx = budgets.findIndex((b) => b.id === selectedBudget.id)
               const hasPrev = idx > 0
               const hasNext = idx >= 0 && idx < budgets.length - 1
               const nav = (
                 <div className={styles.budgetNav}>
                   <button
                     className="btn btn--style-secondary btn--size-small"
                     onClick={() => {
                       if (hasPrev) {
                         setSelectedBudgetId(budgets[idx - 1].id)
                       }
                     }}
                     disabled={!hasPrev}
                   >
                     ◀ Prev
                   </button>
                   <div className={styles.budgetSelect}>
                     <select
                       className="field-input"
                       value={selectedBudget.id}
                       onChange={(e) => setSelectedBudgetId(e.target.value)}
                     >
                       {budgets.map((budget) => (
                         <option key={budget.id} value={budget.id}>
                           {budget.name} • {budget.status}
                         </option>
                       ))}
                     </select>
                   </div>
                   <button
                     className="btn btn--style-secondary btn--size-small"
                     onClick={() => {
                       if (hasNext) {
                         setSelectedBudgetId(budgets[idx + 1].id)
                       }
                     }}
                     disabled={!hasNext}
                   >
                     Next ▶
                   </button>
                 </div>
               )
               return (
                 <BudgetSummaryCard
                   projections={projections}
                   periodLabel={`Budget period: ${formatDate(selectedBudget.startDate)} — ${formatDate(selectedBudget.endDate)}`}
                   periodStatus={selectedBudget.status}
                   nav={nav}
                 />
               )
             })()}

             {/* 2. Split View: The Plan (Left) vs The Ledger (Right) */}
             <div className={styles.splitLayout}>
                 
                 {/* LEFT: THE PLAN (Budget Categories & Pending Items) */}
                 <div className={styles.leftColumn}>
                     
                     {/* Category Summary */}
                     <div className={styles.card}>
                        <h3 className={styles.cardHeader}>
                            📊 Spending by Category
                             <span className={styles.dateBadge}>
                                {formatDate(selectedBudget.startDate)} — {formatDate(selectedBudget.endDate)}
                             </span>
                        </h3>
                        <CategorySummary
                          plannedIncomeItems={projections.plannedItems?.income || []}
                          plannedExpenseItems={projections.plannedItems?.expenses || []}
                          actualIncomeItems={projections.items.income.filter((i) => i.isActual)}
                          actualExpenseItems={projections.items.expenses.filter((i) => i.isActual)}
                        />
                     </div>

                     {/* Pending Items Checklist */}
                     <div className={styles.card}>
                        <h3 className={styles.cardHeader}>📝 Pending Recurring Items</h3>
                        <BudgetItemsList
                          incomeItems={projections.items.income.filter((i) => !i.isActual)}
                          expenseItems={projections.items.expenses.filter((i) => !i.isActual)}
                          transferItems={projections.items.transfers.filter((i) => !i.isActual)}
                          budgetId={selectedBudget.id}
                          accountId={currentAccount.id}
                          onRefresh={fetchSelectedBudget}
                          startDate={selectedBudget.startDate}
                          endDate={selectedBudget.endDate}
                        />
                     </div>
                 </div>

                 {/* RIGHT: THE LEDGER (Transaction Log) */}
                 <div className={styles.rightColumn}>
                     <div className={styles.cardHeader} style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
                        <h3>📒 Transaction Log</h3>
                         {!showAddTransaction && (
                           <button 
                             onClick={() => setShowAddTransaction(true)}
                             className="btn btn--style-secondary btn--size-small"
                           >
                              + Add
                           </button>
                         )}
                     </div>

                     {showAddTransaction && selectedBudget && (
                        <AddTransactionForm 
                          accountId={currentAccount.id}
                          onSuccess={() => {
                            setShowAddTransaction(false)
                            fetchSelectedBudget()
                          }}
                          onCancel={() => setShowAddTransaction(false)}
                        />
                     )}
                     
                     <div className={styles.transactionList}>
                        <TransactionTable
                            title="Income"
                            items={projections.items.income.filter((i) => i.isActual)}
                            type="income"
                            onRefresh={fetchSelectedBudget}
                        />
                        <TransactionTable
                            title="Expenses"
                            items={projections.items.expenses.filter((i) => i.isActual)}
                            type="expense"
                            onRefresh={fetchSelectedBudget}
                        />
                        <TransactionTable
                            title="Transfers"
                            items={projections.items.transfers.filter((i) => i.isActual)}
                            type="transfer"
                            onRefresh={fetchSelectedBudget}
                        />

                        {projections.items.income.filter((i) => i.isActual).length === 0 &&
                        projections.items.expenses.filter((i) => i.isActual).length === 0 &&
                        projections.items.transfers.filter((i) => i.isActual).length === 0 && (
                        <div className={styles.emptyTransactions}>
                            No transactions recorded yet.
                        </div>
                        )}
                     </div>
                 </div>
             </div>

          </>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>💼</div>
            <h2 className={styles.emptyStateTitle}>No Active Budget</h2>
            <p className={styles.emptyStateText}>
              This account has a budget automation configured, but no active budget yet.
            </p>
            <p className={styles.subtitle} style={{ marginBottom: '1.5rem' }}>
              The automation will create budgets automatically when needed.
            </p>
            <Link href="/admin/collections/budget-schedules" className="btn btn--style-secondary">
              Manage Budget Automations
            </Link>
          </div>
        )}
      </div>
    </Gutter>
  )
}
