'use client'

import Link from 'next/link'
import React, { useEffect, useState } from 'react'

interface SetupStatus {
  incomeCategories: number
  expenseCategories: number
  payees: number
  accounts: number
  recurringItems: number
  budgets: number
}

const Dashboard: React.FC = () => {
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const collections = [
          'income-categories',
          'expense-categories',
          'payees',
          'accounts',
          'recurring-items',
          'budgets',
        ]

        const results = await Promise.all(
          collections.map(async (collection) => {
            const response = await fetch(`/api/${collection}?limit=0`)
            const data = await response.json()
            return { collection, count: data.totalDocs || 0 }
          }),
        )

        const statusObj: SetupStatus = {
          incomeCategories: 0,
          expenseCategories: 0,
          payees: 0,
          accounts: 0,
          recurringItems: 0,
          budgets: 0,
        }
        results.forEach(({ collection, count }) => {
          const key = collection.replace(/-([a-z])/g, (g) =>
            g[1].toUpperCase(),
          ) as keyof SetupStatus
          statusObj[key] = count
        })

        setStatus(statusObj)
      } catch (error) {
        console.error('Error fetching setup status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Loading dashboard...</h2>
      </div>
    )
  }

  if (!status) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Error loading dashboard</h2>
      </div>
    )
  }

  const foundationComplete = status.incomeCategories > 0 && status.expenseCategories > 0
  const personalDataComplete = status.payees > 0 && status.accounts > 0
  const setupComplete = foundationComplete && personalDataComplete
  const recurringItemsComplete = status.recurringItems > 0
  const readyForBudgets = setupComplete && recurringItemsComplete

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px' }}>
      <h1 style={{ marginBottom: '1rem' }}>Budget Management Dashboard</h1>
      <p style={{ marginBottom: '2rem', color: '#666' }}>
        Welcome! Schedules and categories are automatically created. Start by adding your personal
        accounts and payees.
      </p>

      {/* Foundation Data (Auto-seeded) */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>✅ Foundation Data (Auto-seeded)</h2>
        <div style={{ background: '#e8f5e9', padding: '1.5rem', borderRadius: '8px' }}>
          {foundationComplete ? (
            <>
              <p style={{ margin: 0, marginBottom: '1rem', color: '#2e7d32' }}>
                <strong>✓ All foundation data is ready!</strong>
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1rem',
                  fontSize: '14px',
                }}
              >
                <div>
                  <strong>{status.incomeCategories}</strong> Income Categories •{' '}
                  <Link
                    href="/admin/collections/income-categories"
                    style={{ color: '#1976d2', textDecoration: 'none' }}
                  >
                    View
                  </Link>
                </div>
                <div>
                  <strong>{status.expenseCategories}</strong> Expense Categories •{' '}
                  <Link
                    href="/admin/collections/expense-categories"
                    style={{ color: '#1976d2', textDecoration: 'none' }}
                  >
                    View
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: '#f57c00' }}>
              ⏳ Foundation data will be created automatically on first startup...
            </p>
          )}
        </div>
      </div>

      {/* Personal Setup */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>⚙️ Your Personal Setup</h2>
        <div style={{ background: '#f5f5f5', padding: '1.5rem', borderRadius: '8px' }}>
          <SetupStep
            number={1}
            title="Add Payees"
            count={status.payees}
            complete={status.payees > 0}
            href="/admin/collections/payees"
            description="Add people/companies you receive money from or pay to"
          />
          <SetupStep
            number={2}
            title="Add Accounts"
            count={status.accounts}
            complete={status.accounts > 0}
            href="/admin/collections/accounts"
            description="Add your bank accounts (checking, savings, credit cards)"
          />
        </div>
      </div>

      {/* Recurring Items Progress */}
      <div style={{ marginBottom: '2rem', opacity: personalDataComplete ? 1 : 0.5 }}>
        <h2 style={{ marginBottom: '1rem' }}>🔄 Recurring Items</h2>
        {!personalDataComplete && (
          <p style={{ color: '#ff6b6b', marginBottom: '1rem' }}>
            ⚠️ Add your accounts and payees first
          </p>
        )}
        <div style={{ background: '#f5f5f5', padding: '1.5rem', borderRadius: '8px' }}>
          <SetupStep
            number={3}
            title="Create Recurring Items"
            count={status.recurringItems}
            complete={status.recurringItems > 0}
            href="/admin/collections/recurring-items"
            description="Define recurring income, expenses, and transfers"
            disabled={!personalDataComplete}
          />
        </div>
      </div>

      {/* Create Budgets */}
      <div style={{ marginBottom: '2rem', opacity: readyForBudgets ? 1 : 0.5 }}>
        <h2 style={{ marginBottom: '1rem' }}>💰 Your Budgets</h2>
        {!readyForBudgets && (
          <p style={{ color: '#ff6b6b', marginBottom: '1rem' }}>
            ⚠️ Complete setup and create recurring items before creating budgets
          </p>
        )}
        <div style={{ background: '#e3f2fd', padding: '1.5rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>
                {status.budgets > 0
                  ? `${status.budgets} Budget${status.budgets > 1 ? 's' : ''} Created`
                  : 'No Budgets Yet'}
              </h3>
              <p style={{ margin: 0, color: '#666' }}>
                Create a new budget for each paycheck cycle
              </p>
            </div>
            <div>
              {readyForBudgets ? (
                <Link
                  href="/admin/collections/budgets/create"
                  style={{
                    background: '#1976d2',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  Create New Budget
                </Link>
              ) : (
                <button
                  disabled
                  style={{
                    background: '#ccc',
                    color: '#666',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'not-allowed',
                  }}
                >
                  Create New Budget
                </button>
              )}
            </div>
          </div>
          {status.budgets > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <Link
                href="/admin/collections/budgets"
                style={{ color: '#1976d2', textDecoration: 'none' }}
              >
                View All Budgets →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 style={{ marginBottom: '1rem' }}>📚 Resources</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
          }}
        >
          <ResourceCard
            title="Getting Started Guide"
            description="Learn how to use the budget system"
            emoji="📖"
          />
          <ResourceCard
            title="Data Model Documentation"
            description="Understand how the data is structured"
            emoji="📊"
          />
          <ResourceCard
            title="Need Help?"
            description="See GETTING_STARTED.md and BUDGET_MODEL.md"
            emoji="❓"
          />
        </div>
      </div>
    </div>
  )
}

interface SetupStepProps {
  number: number
  title: string
  count: number
  complete: boolean
  href: string
  description: string
  disabled?: boolean
  optional?: boolean
}

const SetupStep: React.FC<SetupStepProps> = ({
  number,
  title,
  count,
  complete,
  href,
  description,
  disabled = false,
  optional = false,
}) => {
  return (
    <div
      style={{
        padding: '1rem',
        marginBottom: '0.75rem',
        background: 'white',
        borderRadius: '4px',
        borderLeft: `4px solid ${complete ? '#4caf50' : disabled ? '#ccc' : '#ff9800'}`,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.25rem',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: complete ? '#4caf50' : disabled ? '#ccc' : '#ff9800',
                color: 'white',
                textAlign: 'center',
                lineHeight: '24px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              {complete ? '✓' : number}
            </span>
            <h4 style={{ margin: 0 }}>
              {title} {optional && '(Optional)'}
            </h4>
          </div>
          <p style={{ margin: 0, marginLeft: '32px', color: '#666', fontSize: '14px' }}>
            {description}
          </p>
        </div>
        <div style={{ marginLeft: '1rem', textAlign: 'right' }}>
          <div
            style={{ fontSize: '20px', fontWeight: 'bold', color: complete ? '#4caf50' : '#666' }}
          >
            {count}
          </div>
          {!disabled && (
            <Link
              href={href}
              style={{
                fontSize: '12px',
                color: '#1976d2',
                textDecoration: 'none',
              }}
            >
              {count > 0 ? 'Manage' : 'Add'} →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

interface ResourceCardProps {
  title: string
  description: string
  emoji: string
}

const ResourceCard: React.FC<ResourceCardProps> = ({ title, description, emoji }) => {
  return (
    <div
      style={{
        background: '#f5f5f5',
        padding: '1.5rem',
        borderRadius: '8px',
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '0.5rem' }}>{emoji}</div>
      <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>{title}</h3>
      <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>{description}</p>
    </div>
  )
}

export default Dashboard
