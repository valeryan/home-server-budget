'use client'

import React from 'react'
import styles from './styles.module.scss'

export const CompoundingScheduleLabel = () => {
  return (
    <div className={styles.labelWrapper}>
      <h3 className={styles.label}>
        Compounding Schedule
      </h3>
    </div>
  )
}

export const RecurringScheduleLabel = () => {
  return (
    <div className={styles.labelWrapper}>
      <h3 className={styles.label}>
        Recurring Schedule
      </h3>
    </div>
  )
}

export const ScheduleDetailsLabel = () => {
  return (
    <div className={styles.detailsWrapper}>
      <h4 className={styles.detailsLabel}>
        Schedule Details
      </h4>
    </div>
  )
}

export const BudgetScheduleLabel = () => {
  return (
    <div className={styles.labelWrapper}>
      <h3 className={styles.label}>
        Budget Period Schedule
      </h3>
    </div>
  )
}
