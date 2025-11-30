'use client'

import { useFormFields } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

interface Projections {
  currentBalance: number
  income: number
  expenses: number
  projectedBalance: number
  incomeCount: number
  expenseCount: number
  transferInCount: number
  transferOutCount: number
  loading: boolean
}

export const BudgetProjections: React.FC = () => {
  const startDate = useFormFields(([fields]) => fields.startDate)
  const endDate = useFormFields(([fields]) => fields.endDate)
  const account = useFormFields(([fields]) => fields.account)

  const [projections, setProjections] = useState<Projections>({
    currentBalance: 0,
    income: 0,
    expenses: 0,
    projectedBalance: 0,
    incomeCount: 0,
    expenseCount: 0,
    transferInCount: 0,
    transferOutCount: 0,
    loading: true,
  })

  useEffect(() => {
    const calculateProjections = async () => {
      if (!startDate?.value || !endDate?.value || !account?.value) {
        setProjections({
          currentBalance: 0,
          income: 0,
          expenses: 0,
          projectedBalance: 0,
          incomeCount: 0,
          expenseCount: 0,
          transferInCount: 0,
          transferOutCount: 0,
          loading: false,
        })
        return
      }

      setProjections((prev) => ({ ...prev, loading: true }))

      try {
        const accountId =
          typeof account.value === 'object' && account.value && 'id' in account.value
            ? (account.value as { id: string }).id
            : account.value

        const response = await fetch(
          `/api/budget-projections?startDate=${startDate.value}&endDate=${endDate.value}&account=${accountId}`,
        )

        if (!response.ok) {
          throw new Error('Failed to fetch projections')
        }

        const data = await response.json()
        setProjections({ ...data, loading: false })
      } catch (error) {
        console.error('Error calculating projections:', error)
        setProjections((prev) => ({ ...prev, loading: false }))
      }
    }

    calculateProjections()
  }, [startDate?.value, endDate?.value, account?.value])

  if (projections.loading) {
    return (
      <div
        style={{
          padding: '1rem',
          backgroundColor: 'var(--theme-elevation-50)',
          borderRadius: '4px',
        }}
      >
        <p style={{ margin: 0, color: 'var(--theme-elevation-600)' }}>Calculating projections...</p>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '1.5rem',
        backgroundColor: 'var(--theme-elevation-50)',
        borderRadius: '4px',
        border: '1px solid var(--theme-elevation-150)',
      }}
    >
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>
        Budget Projections
      </h3>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--theme-elevation-600)' }}>Current Balance:</span>
          <span style={{ fontWeight: 600 }}>${projections.currentBalance.toFixed(2)}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--theme-elevation-600)' }}>
            Income ({projections.incomeCount} items):
          </span>
          <span style={{ fontWeight: 600, color: 'var(--theme-success-500)' }}>
            +${projections.income.toFixed(2)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--theme-elevation-600)' }}>
            Expenses ({projections.expenseCount} items):
          </span>
          <span style={{ fontWeight: 600, color: 'var(--theme-error-500)' }}>
            -${projections.expenses.toFixed(2)}
          </span>
        </div>

        {(projections.transferInCount > 0 || projections.transferOutCount > 0) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--theme-elevation-600)' }}>Transfers:</span>
            <span style={{ fontWeight: 600 }}>
              {projections.transferInCount > 0 && `${projections.transferInCount} in`}
              {projections.transferInCount > 0 && projections.transferOutCount > 0 && ', '}
              {projections.transferOutCount > 0 && `${projections.transferOutCount} out`}
            </span>
          </div>
        )}

        <div
          style={{
            marginTop: '0.5rem',
            paddingTop: '0.75rem',
            borderTop: '2px solid var(--theme-elevation-200)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>Projected Balance:</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: '1.25rem',
              color:
                projections.projectedBalance >= 0
                  ? 'var(--theme-success-500)'
                  : 'var(--theme-error-500)',
            }}
          >
            ${projections.projectedBalance.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}
