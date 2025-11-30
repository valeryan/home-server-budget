'use client'

import { Gutter } from '@payloadcms/ui'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

interface Account {
  id: string
  name: string
  accountType: string
  currentBalance: number
}

interface Budget {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'planning' | 'active' | 'closed'
}

interface BudgetProjection {
  currentBalance: number
  income: number
  expenses: number
  projectedBalance: number
  incomeCount: number
  expenseCount: number
  transferInCount: number
  transferOutCount: number
}

interface BudgetDashboardProps {
  accounts: Account[]
  userDefaultAccount?: string
}

export const BudgetDashboard: React.FC<BudgetDashboardProps> = ({
  accounts,
  userDefaultAccount,
}) => {
  const [currentAccountIndex, setCurrentAccountIndex] = useState(0)
  const [activeBudget, setActiveBudget] = useState<Budget | null>(null)
  const [projections, setProjections] = useState<BudgetProjection | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize with default account if provided
  useEffect(() => {
    if (userDefaultAccount && accounts.length > 0) {
      const defaultIndex = accounts.findIndex((acc) => acc.id === userDefaultAccount)
      if (defaultIndex !== -1) {
        setCurrentAccountIndex(defaultIndex)
      }
    }
  }, [userDefaultAccount, accounts])

  const currentAccount = accounts[currentAccountIndex]

  // Fetch active budget for current account
  useEffect(() => {
    if (!currentAccount) return

    const fetchActiveBudget = async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/budgets?where[account][equals]=${currentAccount.id}&where[status][equals]=active&limit=1`,
        )
        const data = await response.json()
        const budget = data.docs?.[0] || null
        setActiveBudget(budget)

        // Fetch projections if budget exists
        if (budget) {
          const projResponse = await fetch(
            `/api/budget-projections?startDate=${budget.startDate}&endDate=${budget.endDate}&account=${currentAccount.id}`,
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
    }

    fetchActiveBudget()
  }, [currentAccount])

  const handlePrevAccount = () => {
    setCurrentAccountIndex((prev) => (prev > 0 ? prev - 1 : accounts.length - 1))
  }

  const handleNextAccount = () => {
    setCurrentAccountIndex((prev) => (prev < accounts.length - 1 ? prev + 1 : 0))
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

  if (accounts.length === 0) {
    return (
      <Gutter>
        <h1 style={{ marginBottom: 'var(--spacing-m)' }}>Budget Dashboard</h1>
        <p style={{ marginBottom: 'var(--spacing-m)' }}>
          <strong>⚠️ No accounts found</strong>
        </p>
        <p style={{ marginBottom: 'var(--spacing-m)', color: 'var(--theme-elevation-700)' }}>
          You need to add at least one account to start managing budgets.
        </p>
        <Link href="/admin/collections/accounts/create" className="btn btn--style-primary">
          Add Account →
        </Link>
      </Gutter>
    )
  }

  return (
    <Gutter>
      <div style={{ paddingBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ marginBottom: 'var(--spacing-l)' }}>Budget Dashboard</h1>

        {/* Account Selector */}
        {accounts.length > 1 ? (
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-m)', fontSize: '1rem', fontWeight: '600' }}>
              Account
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
                onClick={handlePrevAccount}
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
                  ({currentAccountIndex + 1} of {accounts.length})
                </span>
              </div>
              <button
                onClick={handleNextAccount}
                className="btn btn--style-secondary btn--size-small"
              >
                Next →
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-m)', fontSize: '1rem', fontWeight: '600' }}>
              Account
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
                          Current Balance
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                          {formatCurrency(projections.currentBalance)}
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
                              projections.projectedBalance > projections.currentBalance
                                ? 'var(--theme-success-500)'
                                : projections.projectedBalance < projections.currentBalance
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

            {/* Quick Actions */}
            <div>
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
                  href="/admin/collections/accounts"
                  className="btn btn--style-secondary btn--size-small"
                >
                  Manage Accounts
                </Link>
                <Link
                  href="/admin/collections/budgets/create"
                  className="btn btn--style-primary btn--size-small"
                >
                  + Create Budget
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
              This account doesn&apos;t have an active budget period yet.
            </p>
            <Link
              href={`/admin/collections/budgets/create?account=${currentAccount.id}`}
              className="btn btn--style-primary"
            >
              Create Budget for {currentAccount.name}
            </Link>
          </div>
        )}
      </div>
    </Gutter>
  )
}
