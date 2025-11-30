'use client'

import React, { useEffect, useState } from 'react'

interface CategoryCellProps {
  cellData: string | { name: string; id: string } | null
  rowData: {
    itemType?: 'income' | 'expense' | 'transfer'
    incomeCategory?: string | { name: string; id: string }
    expenseCategory?: string | { name: string; id: string }
  }
}

export const RecurringItemCategoryCell: React.FC<CategoryCellProps> = ({ rowData }) => {
  const [categoryName, setCategoryName] = useState<string>('-')

  useEffect(() => {
    const fetchCategoryName = async () => {
      if (rowData.itemType === 'income' && rowData.incomeCategory) {
        if (typeof rowData.incomeCategory === 'object') {
          setCategoryName(rowData.incomeCategory.name)
        } else {
          // It's an ID, fetch the category name
          try {
            const response = await fetch(`/api/income-categories/${rowData.incomeCategory}`)
            const data = await response.json()
            setCategoryName(data.name || rowData.incomeCategory)
          } catch {
            setCategoryName(rowData.incomeCategory)
          }
        }
      } else if (rowData.itemType === 'expense' && rowData.expenseCategory) {
        if (typeof rowData.expenseCategory === 'object') {
          setCategoryName(rowData.expenseCategory.name)
        } else {
          // It's an ID, fetch the category name
          try {
            const response = await fetch(`/api/expense-categories/${rowData.expenseCategory}`)
            const data = await response.json()
            setCategoryName(data.name || rowData.expenseCategory)
          } catch {
            setCategoryName(rowData.expenseCategory)
          }
        }
      } else if (rowData.itemType === 'transfer') {
        setCategoryName('Transfer')
      } else {
        setCategoryName('-')
      }
    }

    fetchCategoryName()
  }, [rowData])

  return <span>{categoryName}</span>
}
