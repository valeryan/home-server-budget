import React from 'react'
import { BudgetProjection, TransferItem } from '@/lib/budget-types'
import { formatCurrency } from '@/lib/formatting'
import styles from './styles.module.scss'

interface BudgetSummaryCardProps {
  projections: BudgetProjection
  periodLabel?: string
  periodStatus?: 'planning' | 'active' | 'closed' | null
  nav?: React.ReactNode
}

export const BudgetSummaryCard: React.FC<BudgetSummaryCardProps> = ({
  projections,
  periodLabel,
  periodStatus,
  nav,
}) => {
  // Calculate Net Transfers
  const transferItems = projections.items.transfers || []
  const transfersIn = transferItems
    .filter((t) => t.direction === 'in')
    .reduce((sum, t) => sum + t.amount, 0)
  const transfersOut = transferItems
    .filter((t) => t.direction === 'out')
    .reduce((sum, t) => sum + t.amount, 0)
  const netTransfers = transfersIn - transfersOut

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h4 className={styles.title}>Budget Summary</h4>
          {periodLabel && (
            <div className={styles.periodRow}>
              <span className={styles.periodLabel}>{periodLabel}</span>
              {periodStatus && (
                <span className={`${styles.statusBadge} ${styles[`status${periodStatus}`]}`}>
                  {periodStatus}
                </span>
              )}
            </div>
          )}
        </div>
        {nav && <div className={styles.headerNav}>{nav}</div>}
        <div className={styles.currentBalance}>
          <span className={styles.label}>Account Balance:</span>
          <span className={styles.value}>{formatCurrency(projections.currentAccountBalance)}</span>
        </div>
      </div>
      
      <div className={styles.grid}>
        {/* 1. Starting Balance */}
        <div className={styles.card}>
            <div className={styles.cardLabel}>Starting Balance</div>
            <div className={styles.cardValue}>
               {formatCurrency(projections.startingBalance)}
            </div>
        </div>

        {/* 2. Income */}
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <div className={styles.cardLabel}>Income</div>
                <div className={`${styles.badge} ${styles.badgeSuccess}`}>
                    {projections.incomeCount}
                </div>
            </div>
            <div className={`${styles.cardValue} ${styles.textSuccess}`}>
               +{formatCurrency(projections.income)}
            </div>
        </div>

        {/* 3. Expenses */}
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <div className={styles.cardLabel}>Expenses</div>
                 <div className={`${styles.badge} ${styles.badgeError}`}>
                    {projections.expenseCount}
                </div>
            </div>
            <div className={`${styles.cardValue} ${styles.textError}`}>
               -{formatCurrency(projections.expenses)}
            </div>
        </div>

        {/* 4. Net Transfers */}
        <div className={styles.card}>
             <div className={styles.cardHeader}>
                <div className={styles.cardLabel}>Net Transfers</div>
             </div>
             <div className={`${styles.cardValue} ${netTransfers >= 0 ? styles.textSuccess : styles.textError}`}>
                {netTransfers > 0 ? '+' : ''}{formatCurrency(netTransfers)}
             </div>
               <div className={styles.subtext}>
                  {formatCurrency(transfersIn)} In / {formatCurrency(transfersOut)} Out
               </div>
        </div>

        {/* 5. Projected Balance */}
        <div className={`${styles.card} ${styles.projectedCard}`}>
            <div className={styles.content}>
                <div className={styles.cardLabel}>Projected End</div>
                <div
                  className={`${styles.cardValue} ${
                    projections.projectedBalance > projections.startingBalance
                      ? styles.textSuccess
                      : projections.projectedBalance < projections.startingBalance
                      ? styles.textError
                      : ''
                  }`}
                >
                  {formatCurrency(projections.projectedBalance)}
                </div>
            </div>
             {/* Subtle indicator bar at the bottom */}
            <div className={`${styles.progressBar} ${projections.projectedBalance >= 0 ? styles.bgSuccessLow : styles.bgErrorLow}`} />
        </div>
      </div>
    </div>
  )
}
