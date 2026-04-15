'use client'

import { Gutter } from '@payloadcms/ui'
import Link from 'next/link'
import React from 'react'

interface SetupStatus {
  incomeCategories: number
  expenseCategories: number
  payees: number
  accounts: number
  recurringItems: number
}

interface AdminConsoleProps {
  status: SetupStatus
}

const shortcuts = [
  {
    href: '/',
    label: 'Open Frontend Budget App',
    description: 'Use the new household dashboard for daily budgeting.',
  },
  {
    href: '/admin/collections/accounts',
    label: 'Accounts',
    description: 'Maintain balances, account types, and system accounts.',
  },
  {
    href: '/admin/collections/recurring-items',
    label: 'Recurring Items',
    description: 'Manage recurring income, expenses, and transfers.',
  },
  {
    href: '/admin/collections/budget-schedules',
    label: 'Budget Schedules',
    description: 'Review automation rules and look-ahead periods.',
  },
  {
    href: '/admin/collections/payees',
    label: 'Payees',
    description: 'Maintain merchant and source entities.',
  },
  {
    href: '/admin/collections/transactions',
    label: 'Transactions',
    description: 'Inspect raw ledger records directly when needed.',
  },
]

export const AdminConsole: React.FC<AdminConsoleProps> = ({ status }) => {
  return (
    <Gutter>
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <p
            style={{
              margin: 0,
              color: 'var(--theme-text-dim)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Setup + Maintenance
          </p>
          <h1 style={{ margin: 0 }}>Admin Console</h1>
          <p style={{ margin: 0, maxWidth: '70ch', color: 'var(--theme-text-dim)' }}>
            The admin is now the system-management surface. Use it for setup, source data, direct
            collection maintenance, and debugging. Day-to-day budgeting belongs in the frontend app.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          }}
        >
          {[
            ['Income Categories', status.incomeCategories],
            ['Expense Categories', status.expenseCategories],
            ['Payees', status.payees],
            ['Accounts', status.accounts],
            ['Recurring Items', status.recurringItems],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                padding: '1rem',
                border: '1px solid var(--theme-elevation-150)',
                borderRadius: '16px',
                background: 'var(--theme-elevation-0)',
              }}
            >
              <div style={{ color: 'var(--theme-text-dim)', fontSize: '0.85rem' }}>{label}</div>
              <strong style={{ fontSize: '1.75rem' }}>{value}</strong>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
        >
          {shortcuts.map((shortcut) => (
            <Link
              key={shortcut.href}
              href={shortcut.href}
              style={{
                display: 'grid',
                gap: '0.5rem',
                padding: '1rem',
                border: '1px solid var(--theme-elevation-150)',
                borderRadius: '16px',
                background: 'var(--theme-elevation-0)',
                textDecoration: 'none',
              }}
            >
              <strong>{shortcut.label}</strong>
              <span style={{ color: 'var(--theme-text-dim)' }}>{shortcut.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </Gutter>
  )
}
