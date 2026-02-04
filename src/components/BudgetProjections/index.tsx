'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'
import styles from './styles.module.scss'

interface Projections {
  startingBalance: number
  currentAccountBalance: number
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
  const { id: budgetId } = useDocumentInfo()
  const startDate = useFormFields(([fields]) => fields.startDate)
  const endDate = useFormFields(([fields]) => fields.endDate)
  const account = useFormFields(([fields]) => fields.account)

  const [projections, setProjections] = useState<Projections>({
    startingBalance: 0,
    currentAccountBalance: 0,
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
          startingBalance: 0,
          currentAccountBalance: 0,
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

        const url = `/api/budget-projections?startDate=${startDate.value}&endDate=${endDate.value}&account=${accountId}${budgetId ? `&budgetId=${budgetId}` : ''}`

        const response = await fetch(url)

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
  }, [startDate?.value, endDate?.value, account?.value, budgetId])

  if (projections.loading) {
    return (
      <div className={styles.loadingContainer}>
        <p className={styles.loadingText}>Calculating projections...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        Budget Projections
      </h3>

      <div className={styles.grid}>
        <div className={styles.row}>
          <span className={styles.label}>Starting Balance:</span>
          <span className={styles.value}>${projections.startingBalance.toFixed(2)}</span>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>Current Account Balance:</span>
          <span className={styles.value}>${projections.currentAccountBalance.toFixed(2)}</span>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>
            Income ({projections.incomeCount} items):
          </span>
          <span className={`${styles.value} ${styles.income}`}>
            +${projections.income.toFixed(2)}
          </span>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>
            Expenses ({projections.expenseCount} items):
          </span>
          <span className={`${styles.value} ${styles.expense}`}>
            -${projections.expenses.toFixed(2)}
          </span>
        </div>

        {(projections.transferInCount > 0 || projections.transferOutCount > 0) && (
          <div className={styles.row}>
            <span className={styles.label}>Transfers:</span>
            <span className={styles.value}>
              {projections.transferInCount > 0 && `${projections.transferInCount} in`}
              {projections.transferInCount > 0 && projections.transferOutCount > 0 && ', '}
              {projections.transferOutCount > 0 && `${projections.transferOutCount} out`}
            </span>
          </div>
        )}

        <div className={styles.projectedRow}>
          <span className={styles.projectedLabel}>Projected Balance:</span>
          <span
            className={`${styles.projectedValue} ${
              projections.projectedBalance >= 0 ? styles.income : styles.expense
            }`}
          >
            ${projections.projectedBalance.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}
