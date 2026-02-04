'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import styles from './styles.module.scss'

export const DashboardNavLink: React.FC = () => {
  const pathname = usePathname()
  const isActive = pathname === '/admin'

  return (
    <div className={styles.wrapper}>
      <Link
        href="/admin"
        className={`${styles.link} ${isActive ? styles.active : ''}`}
      >
        <span className={styles.icon}>🏠</span>
        Dashboard
      </Link>
    </div>
  )
}
