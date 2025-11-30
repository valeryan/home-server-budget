'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

export const DashboardNavLink: React.FC = () => {
  const pathname = usePathname()
  const isActive = pathname === '/admin'

  return (
    <div
      style={{
        borderBottom: '1px solid var(--theme-elevation-150)',
        marginBottom: '0.5rem',
        paddingBottom: '0.5rem',
      }}
    >
      <Link
        href="/admin"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0.5rem 1rem',
          textDecoration: 'none',
          color: isActive ? 'var(--theme-text)' : 'var(--theme-elevation-800)',
          background: isActive ? 'var(--theme-elevation-100)' : 'transparent',
          borderRadius: '4px',
          fontWeight: isActive ? '600' : '400',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'var(--theme-elevation-50)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'transparent'
          }
        }}
      >
        <span style={{ marginRight: '0.5rem' }}>🏠</span>
        Dashboard
      </Link>
    </div>
  )
}
