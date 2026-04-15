'use client'

import React from 'react'
import styles from './styles.module.scss'

export const SyncedTransactionBadge: React.FC = () => {
  return (
    <div className={styles.banner}>
      <span className={styles.icon}>🔒</span>
      <div>
        <strong>Synced from bank</strong>
        <p>
          Date, amount, and description are read-only — they reflect what your bank reported. You
          can still edit the category, notes, and reconciled status.
        </p>
      </div>
    </div>
  )
}
