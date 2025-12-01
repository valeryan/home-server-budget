'use client'

import { useDocumentInfo } from '@payloadcms/ui'
import React, { useState } from 'react'

export const RecalculateBalanceButton: React.FC = () => {
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const { id } = useDocumentInfo()

  const handleRecalculate = async () => {
    if (!id) {
      alert('Cannot recalculate: Account ID not found')
      return
    }

    if (
      !confirm('This will recalculate the current balance based on all transactions. Continue?')
    ) {
      return
    }

    setIsRecalculating(true)
    setResult(null)

    try {
      const response = await fetch('/api/recalculate-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId: id }),
      })

      if (!response.ok) {
        throw new Error('Failed to recalculate balance')
      }

      const data = await response.json()

      setResult(
        `✓ Balance recalculated successfully!\nOld balance: $${data.oldBalance.toFixed(2)}\nNew balance: $${data.newBalance.toFixed(2)}\nTransactions processed: ${data.transactionCount}`,
      )

      // Refresh the page after a short delay to show the updated balance
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('Error recalculating balance:', error)
      setResult('✗ Failed to recalculate balance. Check the console for details.')
    } finally {
      setIsRecalculating(false)
    }
  }

  return (
    <div
      style={{
        padding: 'var(--spacing-m)',
        background: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 'var(--border-radius)',
      }}
    >
      <h3 style={{ marginBottom: 'var(--spacing-s)', fontSize: '1rem', fontWeight: '600' }}>
        Balance Management
      </h3>
      <p style={{ marginBottom: 'var(--spacing-m)', color: 'var(--theme-elevation-600)' }}>
        If the current balance seems incorrect, you can recalculate it from the starting balance and
        all transactions.
      </p>
      <button
        type="button"
        onClick={handleRecalculate}
        disabled={isRecalculating}
        className="btn btn--style-secondary btn--size-small"
      >
        {isRecalculating ? 'Recalculating...' : '🔄 Recalculate Balance'}
      </button>
      {result && (
        <pre
          style={{
            marginTop: 'var(--spacing-m)',
            padding: 'var(--spacing-s)',
            background: 'var(--theme-elevation-0)',
            borderRadius: 'var(--border-radius)',
            fontSize: '0.875rem',
            whiteSpace: 'pre-wrap',
          }}
        >
          {result}
        </pre>
      )}
    </div>
  )
}
