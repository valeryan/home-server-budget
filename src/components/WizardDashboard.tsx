'use client'

import { Gutter } from '@payloadcms/ui'
import Link from 'next/link'
import React from 'react'

interface SetupStatus {
  incomeCategories: number
  expenseCategories: number
  payees: number
  accounts: number
}

interface WizardDashboardProps {
  status: SetupStatus
}

export const WizardDashboard: React.FC<WizardDashboardProps> = ({ status }) => {
  const categoriesComplete = status.incomeCategories > 0 && status.expenseCategories > 0
  const setupComplete = status.payees > 0 && status.accounts > 0

  return (
    <Gutter>
      <h1 style={{ marginBottom: 'var(--spacing-m)' }}>Welcome to Budget Manager! 🎉</h1>
      <p style={{ marginBottom: 'var(--spacing-xl)', color: 'var(--theme-elevation-800)' }}>
        Let&apos;s get your budget system set up. We&apos;ve already created default categories for
        you, but you&apos;ll need to add your personal information to get started.
      </p>

      {/* Foundation Data (Auto-seeded) */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-m)', fontSize: '1.25rem' }}>
          ✅ Foundation Data (Auto-seeded)
        </h2>
        <div
          style={{
            background: 'var(--theme-elevation-50)',
            padding: 'var(--spacing-l)',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--theme-elevation-150)',
          }}
        >
          {categoriesComplete ? (
            <>
              <p style={{ margin: 0, marginBottom: 'var(--spacing-m)' }}>
                <strong>✓ Categories are ready!</strong>
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 'var(--spacing-m)',
                  fontSize: '0.875rem',
                }}
              >
                <div>
                  <strong>{status.incomeCategories}</strong> Income Categories •{' '}
                  <Link
                    href="/admin/collections/income-categories"
                    style={{
                      color: 'var(--theme-success-500)',
                      textDecoration: 'none',
                    }}
                  >
                    View & Add More
                  </Link>
                </div>
                <div>
                  <strong>{status.expenseCategories}</strong> Expense Categories •{' '}
                  <Link
                    href="/admin/collections/expense-categories"
                    style={{
                      color: 'var(--theme-success-500)',
                      textDecoration: 'none',
                    }}
                  >
                    View & Add More
                  </Link>
                </div>
              </div>
              <p
                style={{
                  marginTop: 'var(--spacing-m)',
                  marginBottom: 0,
                  fontSize: '0.875rem',
                  color: 'var(--theme-elevation-600)',
                }}
              >
                💡 <em>You can add more categories anytime to better organize your budget.</em>
              </p>
            </>
          ) : (
            <p style={{ margin: 0, color: 'var(--theme-warning-500)' }}>
              ⏳ Foundation data will be created automatically on first startup...
            </p>
          )}
        </div>
      </div>

      {/* Setup Steps */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-m)', fontSize: '1.25rem' }}>⚙️ Required Setup</h2>
        <p style={{ marginBottom: 'var(--spacing-m)', color: 'var(--theme-elevation-700)' }}>
          Complete these steps to start managing your budget:
        </p>
        <div
          style={{
            background: 'var(--theme-elevation-50)',
            padding: 'var(--spacing-l)',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--theme-elevation-150)',
          }}
        >
          <SetupStep
            number={1}
            title="Add at least 1 Payee"
            count={status.payees}
            complete={status.payees > 0}
            href="/admin/collections/payees/create"
            manageHref="/admin/collections/payees"
            description="People or companies you receive money from or pay to (employer, utility companies, etc.)"
            required
          />
          <SetupStep
            number={2}
            title="Add at least 1 Account"
            count={status.accounts}
            complete={status.accounts > 0}
            href="/admin/collections/accounts/create"
            manageHref="/admin/collections/accounts"
            description="Your bank accounts, credit cards, or cash accounts where money flows"
            required
            isLast
          />
        </div>
      </div>

      {/* Completion Status */}
      {setupComplete && (
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div
            style={{
              background: 'var(--theme-success-100)',
              color: 'var(--theme-success-900)',
              padding: 'var(--spacing-xl)',
              borderRadius: 'var(--border-radius)',
              textAlign: 'center',
              border: '1px solid var(--theme-success-300)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-m)' }}>🎊</div>
            <h2 style={{ margin: 0, marginBottom: 'var(--spacing-s)' }}>Setup Complete!</h2>
            <p style={{ margin: 0, marginBottom: 'var(--spacing-l)', fontSize: '1rem' }}>
              You&apos;re ready to start managing your budget. The dashboard will now show your
              active budgets.
            </p>
            <Link
              href="/admin/collections/recurring-items/create"
              className="btn btn--style-primary"
              style={{
                display: 'inline-block',
              }}
            >
              Next: Add Recurring Items →
            </Link>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div>
        <h2 style={{ marginBottom: 'var(--spacing-m)', fontSize: '1.25rem' }}>❓ Need Help?</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 'var(--spacing-m)',
          }}
        >
          <ResourceCard
            title="What are Payees?"
            description="Entities you transact with - your employer, landlord, grocery store, etc."
            emoji="👥"
          />
          <ResourceCard
            title="What are Accounts?"
            description="Where your money lives - checking accounts, savings, credit cards, cash."
            emoji="🏦"
          />
          <ResourceCard
            title="Next Steps"
            description="After setup, you'll add recurring items and create budget periods."
            emoji="📋"
          />
        </div>
      </div>
    </Gutter>
  )
}

interface SetupStepProps {
  number: number
  title: string
  count: number
  complete: boolean
  href: string
  manageHref: string
  description: string
  required?: boolean
  isLast?: boolean
}

const SetupStep: React.FC<SetupStepProps> = ({
  number,
  title,
  count,
  complete,
  href,
  manageHref,
  description,
  required = false,
  isLast = false,
}) => {
  return (
    <div
      style={{
        padding: 'var(--spacing-l)',
        marginBottom: isLast ? 0 : 'var(--spacing-m)',
        background: 'var(--theme-bg)',
        borderRadius: 'var(--border-radius)',
        borderLeft: `4px solid ${complete ? 'var(--theme-success-500)' : 'var(--theme-warning-500)'}`,
        border: '1px solid var(--theme-elevation-150)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-s)',
              marginBottom: 'var(--spacing-s)',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: complete ? 'var(--theme-success-500)' : 'var(--theme-warning-500)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 'bold',
              }}
            >
              {complete ? '✓' : number}
            </span>
            <div>
              <h3 style={{ margin: 0 }}>
                {title}
                {required && (
                  <span
                    style={{
                      color: 'var(--theme-error-500)',
                      marginLeft: 'var(--spacing-xs)',
                      fontSize: '0.875rem',
                    }}
                  >
                    *
                  </span>
                )}
              </h3>
            </div>
          </div>
          <p
            style={{
              margin: 0,
              marginLeft: '44px',
              color: 'var(--theme-elevation-700)',
              fontSize: '0.875rem',
              lineHeight: '1.5',
            }}
          >
            {description}
          </p>
        </div>
        <div style={{ marginLeft: 'var(--spacing-l)', textAlign: 'right' }}>
          <div
            style={{
              fontSize: '1.75rem',
              fontWeight: 'bold',
              color: complete ? 'var(--theme-success-500)' : 'var(--theme-elevation-400)',
              marginBottom: 'var(--spacing-xs)',
            }}
          >
            {count}
          </div>
          {complete ? (
            <Link
              href={manageHref}
              style={{
                fontSize: '0.8125rem',
                color: 'var(--theme-success-500)',
                textDecoration: 'none',
                fontWeight: '500',
              }}
            >
              Manage →
            </Link>
          ) : (
            <Link href={href} className="btn btn--style-primary btn--size-small">
              Add Now →
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
        background: 'var(--theme-elevation-50)',
        padding: 'var(--spacing-l)',
        borderRadius: 'var(--border-radius)',
        border: '1px solid var(--theme-elevation-150)',
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-s)' }}>{emoji}</div>
      <h3 style={{ margin: 0, marginBottom: 'var(--spacing-xs)' }}>{title}</h3>
      <p
        style={{
          margin: 0,
          color: 'var(--theme-elevation-700)',
          fontSize: '0.8125rem',
          lineHeight: '1.5',
        }}
      >
        {description}
      </p>
    </div>
  )
}
