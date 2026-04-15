'use client'

import React from 'react'

interface CurrencyCellProps {
  cellData: number | null | undefined
}

export const CurrencyCell: React.FC<CurrencyCellProps> = ({ cellData }) => {
  const formatted =
    cellData != null
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(cellData)
      : '-'

  return <span>{formatted}</span>
}
