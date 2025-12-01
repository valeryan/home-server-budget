'use client'

import { Gutter } from '@payloadcms/ui'
import Link from 'next/link'
import React, { useCallback, useEffect, useState } from 'react'
import { BudgetItemsList } from './BudgetItemsList'

interface BudgetAutomation {
  id: string
  name: string
  account: {
    id: string
    name: string
    accountType: string
    currentBalance: number
  }
  scheduleType: string
  isActive: boolean
}

interface Budget {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'planning' | 'active' | 'closed'
}

interface BudgetProjection {
  startingBalance: number
  currentAccountBalance: number
  income: number
  expenses: number
  projectedBalance: number
  incomeCount: number
  expenseCount: number
  transferInCount: number
  transferOutCount: number
  items: {
    income: Array<{
      id: string
      name: string
      amount: number
      categoryId: string | null
      categoryName: string | null
      payeeId: string | null
      payeeName: string | null
      isActual?: boolean
    }>
    expenses: Array<{
      id: string
      name: string
      amount: number
      categoryId: string | null
      categoryName: string | null
      payeeId: string | null
      payeeName: string | null
      isActual?: boolean
    }>
    transfers: Array<{
      id: string
      name: string
      amount: number
      direction: 'in' | 'out'
      otherAccountId: string | null
      otherAccountName: string | null
      isActual?: boolean
    }>
  }
}

interface BudgetDashboardProps {
  automations: BudgetAutomation[]
}

export const BudgetDashboard: React.FC<BudgetDashboardProps> = ({ automations }) => {
  const [currentAutomationIndex, setCurrentAutomationIndex] = useState(0)
  const [activeBudget, setActiveBudget] = useState<Budget | null>(null)
  const [projections, setProjections] = useState<BudgetProjection | null>(null)
  const [loading, setLoading] = useState(true)

  const currentAutomation = automations[currentAutomationIndex]
  const currentAccount = currentAutomation?.account

  // Fetch active budget and projections for current automation
  const fetchActiveBudget = useCallback(async () => {
    if (!currentAccount) return

    setLoading(true)

    try {
      // Trigger auto-advance for this account
      await fetch(`/api/budget-auto-advance?account=${currentAccount.id}`)

      // Then fetch the active budget
      const response = await fetch(
        `/api/budgets?where[account][equals]=${currentAccount.id}&where[status][equals]=active&limit=1`,
      )
      const data = await response.json()
      const budget = data.docs?.[0] || null
      setActiveBudget(budget)

      // Fetch projections if budget exists
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
      setActiveBudget(null)
      setProjections(null)
    } finally {
      setLoading(false)
    }
  }, [currentAccount])

  // Fetch active budget for current automation
  useEffect(() => {
    fetchActiveBudget()
  }, [fetchActiveBudget])

  const handlePrevAutomation = () => {
    setCurrentAutomationIndex((prev) => (prev > 0 ? prev - 1 : automations.length - 1))
  }

  const handleNextAutomation = () => {
    setCurrentAutomationIndex((prev) => (prev < automations.length - 1 ? prev + 1 : 0))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (automations.length === 0) {
    return (
      <Gutter>
        <h1 style={{ marginBottom: 'var(--spacing-m)' }}>Budget Dashboard</h1>
        <div
          style={{
            background: 'var(--theme-elevation-50)',
            padding: 'var(--spacing-xxl)',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--theme-elevation-150)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-m)' }}>⚙️</div>
          <h2 style={{ marginBottom: 'var(--spacing-m)' }}>No Budget Automations</h2>
          <p style={{ marginBottom: 'var(--spacing-l)', color: 'var(--theme-elevation-700)' }}>
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
      <div style={{ paddingBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ marginBottom: 'var(--spacing-l)' }}>Budget Dashboard</h1>

        {/* Automation Selector */}
        {automations.length > 1 ? (
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-m)', fontSize: '1rem', fontWeight: '600' }}>
              Budget Automation
            </h3>
            <div
              style={{
                background: 'var(--theme-elevation-50)',
                padding: 'var(--spacing-l)',
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--theme-elevation-150)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-m)',
              }}
            >
              <button
                onClick={handlePrevAutomation}
                className="btn btn--style-secondary btn--size-small"
              >
                ← Previous
              </button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <strong style={{ fontSize: '1.125rem' }}>{currentAccount.name}</strong>
                <span
                  style={{
                    marginLeft: 'var(--spacing-s)',
                    color: 'var(--theme-elevation-600)',
                    fontSize: '0.875rem',
                  }}
                >
                  ({currentAutomationIndex + 1} of {automations.length})
                </span>
              </div>
              <button
                onClick={handleNextAutomation}
                className="btn btn--style-secondary btn--size-small"
              >
                Next →
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-m)', fontSize: '1rem', fontWeight: '600' }}>
              Budget Automation
            </h3>
            <p style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
              {currentAccount.name}
            </p>
          </div>
        )}

        {/* Active Budget Display */}
        {loading ? (
          <p style={{ color: 'var(--theme-elevation-600)' }}>Loading budget...</p>
        ) : activeBudget ? (
          <>
            <div style={{ marginBottom: 'var(--spacing-xxl)' }}>
              <h3 style={{ marginBottom: 'var(--spacing-m)', fontSize: '1rem', fontWeight: '600' }}>
                Active Budget
              </h3>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'var(--spacing-l)',
                  paddingBottom: 'var(--spacing-m)',
                  borderBottom: '1px solid var(--theme-elevation-150)',
                }}
              >
                <div>
                  <h2 style={{ margin: 0, marginBottom: 'var(--spacing-xs)', fontSize: '1.25rem' }}>
                    {activeBudget.name}
                  </h2>
                  <p
                    style={{ margin: 0, color: 'var(--theme-elevation-700)', fontSize: '0.875rem' }}
                  >
                    {formatDate(activeBudget.startDate)} – {formatDate(activeBudget.endDate)}
                  </p>
                </div>
                <Link
                  href={`/admin/collections/budgets/${activeBudget.id}`}
                  className="btn btn--style-secondary btn--size-small"
                >
                  View Budget →
                </Link>
              </div>

              {projections && (
                <>
                  <h4
                    style={{
                      marginBottom: 'var(--spacing-m)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      color: 'var(--theme-elevation-600)',
                    }}
                  >
                    Budget Summary
                  </h4>
                  <div
                    style={{
                      background: 'var(--theme-elevation-50)',
                      padding: 'var(--spacing-l)',
                      borderRadius: 'var(--border-radius)',
                      border: '1px solid var(--theme-elevation-150)',
                      marginBottom: 'var(--spacing-l)',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: 'var(--spacing-l)',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--theme-elevation-600)',
                            marginBottom: 'var(--spacing-xs)',
                          }}
                        >
                          Starting Balance
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                          {formatCurrency(projections.startingBalance)}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--theme-elevation-600)',
                            marginBottom: 'var(--spacing-xs)',
                          }}
                        >
                          Current Balance
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                          {formatCurrency(projections.currentAccountBalance)}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--theme-elevation-600)',
                            marginBottom: 'var(--spacing-xs)',
                          }}
                        >
                          Income ({projections.incomeCount})
                        </div>
                        <div
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            color: 'var(--theme-success-500)',
                          }}
                        >
                          {formatCurrency(projections.income)}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--theme-elevation-600)',
                            marginBottom: 'var(--spacing-xs)',
                          }}
                        >
                          Expenses ({projections.expenseCount})
                        </div>
                        <div
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            color: 'var(--theme-error-500)',
                          }}
                        >
                          {formatCurrency(projections.expenses)}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--theme-elevation-600)',
                            marginBottom: 'var(--spacing-xs)',
                          }}
                        >
                          Projected Balance
                        </div>
                        <div
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            color:
                              projections.projectedBalance > projections.startingBalance
                                ? 'var(--theme-success-500)'
                                : projections.projectedBalance < projections.startingBalance
                                  ? 'var(--theme-error-500)'
                                  : 'inherit',
                          }}
                        >
                          {formatCurrency(projections.projectedBalance)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {(projections.transferInCount > 0 || projections.transferOutCount > 0) && (
                    <p
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--theme-elevation-600)',
                        margin: 0,
                        marginTop: 'var(--spacing-m)',
                        fontStyle: 'italic',
                      }}
                    >
                      Transfers: {projections.transferInCount} in, {projections.transferOutCount}{' '}
                      out
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Budget Items */}
            {projections && projections.items && (
              <>
                <BudgetItemsList
                  incomeItems={projections.items.income.filter((i) => !i.isActual)}
                  expenseItems={projections.items.expenses.filter((i) => !i.isActual)}
                  transferItems={projections.items.transfers.filter((i) => !i.isActual)}
                  budgetId={activeBudget.id}
                  accountId={currentAccount.id}
                  onRefresh={fetchActiveBudget}
                />

                {/* Transactions in this budget period */}
                <div style={{ marginTop: 'var(--spacing-xxl)' }}>
                  <h4
                    style={{
                      marginBottom: 'var(--spacing-m)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      color: 'var(--theme-elevation-600)',
                    }}
                  >
                    Transactions in Period
                  </h4>

                  {/* Income Transactions */}
                  {projections.items.income.filter((i) => i.isActual).length > 0 && (
                    <div style={{ marginBottom: 'var(--spacing-l)' }}>
                      <h5
                        style={{
                          marginBottom: 'var(--spacing-s)',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: 'var(--theme-success-500)',
                        }}
                      >
                        Income
                      </h5>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--spacing-s)',
                        }}
                      >
                        {projections.items.income
                          .filter((i) => i.isActual)
                          .map((item) => (
                            <div
                              key={item.id}
                              style={{
                                background: 'var(--theme-elevation-0)',
                                border: '1px solid var(--theme-elevation-150)',
                                borderRadius: 'var(--border-radius)',
                                padding: 'var(--spacing-m)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{ fontWeight: '600', marginBottom: 'var(--spacing-xs)' }}
                                >
                                  {item.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.875rem',
                                    color: 'var(--theme-elevation-600)',
                                  }}
                                >
                                  {item.categoryName && (
                                    <span style={{ marginRight: 'var(--spacing-s)' }}>
                                      📁 {item.categoryName}
                                    </span>
                                  )}
                                  {item.payeeName && <span>👤 {item.payeeName}</span>}
                                </div>
                              </div>
                              <div
                                style={{
                                  fontSize: '1.125rem',
                                  fontWeight: 'bold',
                                  color: 'var(--theme-success-500)',
                                }}
                              >
                                +{formatCurrency(item.amount)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Expense Transactions */}
                  {projections.items.expenses.filter((i) => i.isActual).length > 0 && (
                    <div style={{ marginBottom: 'var(--spacing-l)' }}>
                      <h5
                        style={{
                          marginBottom: 'var(--spacing-s)',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: 'var(--theme-error-500)',
                        }}
                      >
                        Expenses
                      </h5>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--spacing-s)',
                        }}
                      >
                        {projections.items.expenses
                          .filter((i) => i.isActual)
                          .map((item) => (
                            <div
                              key={item.id}
                              style={{
                                background: 'var(--theme-elevation-0)',
                                border: '1px solid var(--theme-elevation-150)',
                                borderRadius: 'var(--border-radius)',
                                padding: 'var(--spacing-m)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{ fontWeight: '600', marginBottom: 'var(--spacing-xs)' }}
                                >
                                  {item.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.875rem',
                                    color: 'var(--theme-elevation-600)',
                                  }}
                                >
                                  {item.categoryName && (
                                    <span style={{ marginRight: 'var(--spacing-s)' }}>
                                      📁 {item.categoryName}
                                    </span>
                                  )}
                                  {item.payeeName && <span>👤 {item.payeeName}</span>}
                                </div>
                              </div>
                              <div
                                style={{
                                  fontSize: '1.125rem',
                                  fontWeight: 'bold',
                                  color: 'var(--theme-error-500)',
                                }}
                              >
                                -{formatCurrency(item.amount)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Transfer Transactions */}
                  {projections.items.transfers.filter((i) => i.isActual).length > 0 && (
                    <div style={{ marginBottom: 'var(--spacing-l)' }}>
                      <h5
                        style={{
                          marginBottom: 'var(--spacing-s)',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                        }}
                      >
                        Transfers
                      </h5>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--spacing-s)',
                        }}
                      >
                        {projections.items.transfers
                          .filter((i) => i.isActual)
                          .map((item) => (
                            <div
                              key={item.id}
                              style={{
                                background: 'var(--theme-elevation-0)',
                                border: '1px solid var(--theme-elevation-150)',
                                borderRadius: 'var(--border-radius)',
                                padding: 'var(--spacing-m)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{ fontWeight: '600', marginBottom: 'var(--spacing-xs)' }}
                                >
                                  {item.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.875rem',
                                    color: 'var(--theme-elevation-600)',
                                  }}
                                >
                                  {item.direction === 'out' ? '➡️ To' : '⬅️ From'}:{' '}
                                  {item.otherAccountName || 'Unknown'}
                                </div>
                              </div>
                              <div
                                style={{
                                  fontSize: '1.125rem',
                                  fontWeight: 'bold',
                                  color:
                                    item.direction === 'in'
                                      ? 'var(--theme-success-500)'
                                      : 'var(--theme-error-500)',
                                }}
                              >
                                {item.direction === 'in' ? '+' : '-'}
                                {formatCurrency(item.amount)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {projections.items.income.filter((i) => i.isActual).length === 0 &&
                    projections.items.expenses.filter((i) => i.isActual).length === 0 &&
                    projections.items.transfers.filter((i) => i.isActual).length === 0 && (
                      <p style={{ color: 'var(--theme-elevation-600)', fontStyle: 'italic' }}>
                        No transactions recorded in this budget period yet.
                      </p>
                    )}
                </div>
              </>
            )}

            {/* Quick Actions */}
            <div style={{ marginTop: 'var(--spacing-xxl)' }}>
              <h4
                style={{
                  marginBottom: 'var(--spacing-m)',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  color: 'var(--theme-elevation-600)',
                }}
              >
                Quick Actions
              </h4>
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--spacing-s)',
                  flexWrap: 'wrap',
                }}
              >
                <Link
                  href="/admin/collections/recurring-items"
                  className="btn btn--style-secondary btn--size-small"
                >
                  Manage Recurring Items
                </Link>
                <Link
                  href="/admin/collections/budgets"
                  className="btn btn--style-secondary btn--size-small"
                >
                  All Budgets
                </Link>
                <Link
                  href="/admin/collections/budget-schedules"
                  className="btn btn--style-secondary btn--size-small"
                >
                  Manage Budget Automations
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div
            style={{
              background: 'var(--theme-elevation-50)',
              padding: 'var(--spacing-xxl)',
              borderRadius: 'var(--border-radius)',
              border: '1px solid var(--theme-elevation-150)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-m)' }}>💼</div>
            <h2 style={{ marginBottom: 'var(--spacing-m)' }}>No Active Budget</h2>
            <p style={{ marginBottom: 'var(--spacing-l)', color: 'var(--theme-elevation-700)' }}>
              This account has a budget automation configured, but no active budget yet.
            </p>
            <p
              style={{
                marginBottom: 'var(--spacing-l)',
                color: 'var(--theme-elevation-700)',
                fontSize: '0.875rem',
              }}
            >
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
