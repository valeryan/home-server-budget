'use client'

import { Gutter } from '@payloadcms/ui'
import Link from 'next/link'
import React from 'react'
import styles from './styles.module.scss'

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
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome to Budget Manager! 🎉</h1>
        <p className={styles.intro}>
          Let&apos;s get your budget system set up. We&apos;ve already created default categories for
          you, but you&apos;ll need to add your personal information to get started.
        </p>
      </div>

      {/* Foundation Data (Auto-seeded) */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          ✅ Foundation Data (Auto-seeded)
        </h2>
        <div className={styles.card}>
          {categoriesComplete ? (
            <>
              <p className={styles.completionText}>
                <strong>✓ Categories are ready!</strong>
              </p>
              <div className={styles.statsGrid}>
                <div>
                  <strong>{status.incomeCategories}</strong> Income Categories •{' '}
                  <Link
                    href="/admin/collections/income-categories"
                    className={styles.link}
                  >
                    View & Add More
                  </Link>
                </div>
                <div>
                  <strong>{status.expenseCategories}</strong> Expense Categories •{' '}
                  <Link
                    href="/admin/collections/expense-categories"
                    className={styles.link}
                  >
                    View & Add More
                  </Link>
                </div>
              </div>
              <p className={styles.tip}>
                💡 <em>You can add more categories anytime to better organize your budget.</em>
              </p>
            </>
          ) : (
            <p className={styles.warningText}>
              ⏳ Foundation data will be created automatically on first startup...
            </p>
          )}
        </div>
      </div>

      {/* Setup Steps */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>⚙️ Required Setup</h2>
        <p className={styles.sectionDesc}>
          Complete these steps to start managing your budget:
        </p>
        <div className={styles.card} style={{ padding: 'var(--spacing-l)', background: 'var(--theme-elevation-50)'}}>
           {/* Overriding card padding/bg slightly for the container of steps if needed, but reusing card class for consistency */}
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
        <div className={styles.completionCard}>
          <div className={styles.completionEmoji}>🎊</div>
          <h2 className={styles.completionTitle}>Setup Complete!</h2>
          <p className={styles.completionDesc}>
            You&apos;re ready to start managing your budget. The dashboard will now show your
            active budgets.
          </p>
          <Link
            href="/admin/collections/recurring-items/create"
            className={`btn btn--style-primary ${styles.nextButton}`}
          >
            Next: Add Recurring Items →
          </Link>
        </div>
      )}

      {/* Help Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>❓ Need Help?</h2>
        <div className={styles.helpGrid}>
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
      className={`${styles.stepCard} ${complete ? styles.stepComplete : styles.stepIncomplete}`}
    >
      <div className={styles.stepContent}>
        <div className={styles.stepBody}>
          <div className={styles.stepHeader}>
            <span
              className={`${styles.stepBadge} ${complete ? styles.badgeComplete : styles.badgeIncomplete}`}
            >
              {complete ? '✓' : number}
            </span>
            <div>
              <h3 className={styles.stepTitle}>
                {title}
                {required && (
                  <span className={styles.requiredStar}>
                    *
                  </span>
                )}
              </h3>
            </div>
          </div>
          <p className={styles.stepDesc}>
            {description}
          </p>
        </div>
        <div className={styles.stepActions}>
          <div
            className={`${styles.stepCount} ${complete ? styles.countComplete : styles.countIncomplete}`}
          >
            {count}
          </div>
          {complete ? (
            <Link
              href={manageHref}
              className={styles.link}
              style={{ fontSize: '0.8125rem' }}
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
    <div className={styles.resourceCard}>
      <div className={styles.resourceEmoji}>{emoji}</div>
      <h3 className={styles.resourceTitle}>{title}</h3>
      <p className={styles.resourceDesc}>
        {description}
      </p>
    </div>
  )
}
