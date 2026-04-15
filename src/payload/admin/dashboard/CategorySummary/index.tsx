import React from 'react'
import { BudgetItem } from '@/domain/budgets/types'
import { formatCurrency } from '@/shared/formatting'
import styles from './styles.module.scss'

interface CategorySummaryProps {
  plannedIncomeItems: BudgetItem[]
  plannedExpenseItems: BudgetItem[]
  actualIncomeItems: BudgetItem[]
  actualExpenseItems: BudgetItem[]
}

interface CategoryRow {
  name: string
  planned: number
  actual: number
  items: BudgetItem[]
}

export const CategorySummary: React.FC<CategorySummaryProps> = ({
  plannedIncomeItems,
  plannedExpenseItems,
  actualIncomeItems,
  actualExpenseItems,
}) => {
  const aggregateByCategory = (
    plannedItems: BudgetItem[],
    actualItems: BudgetItem[],
  ): CategoryRow[] => {
    const map = new Map<string, CategoryRow>()

    plannedItems.forEach((item) => {
      const catName = item.categoryName || 'Uncategorized'
      if (!map.has(catName)) {
        map.set(catName, { name: catName, planned: 0, actual: 0, items: [] })
      }
      const row = map.get(catName)!
      row.planned += item.amount
      row.items.push(item)
    })

    actualItems.forEach((item) => {
      const catName = item.categoryName || 'Uncategorized'
      if (!map.has(catName)) {
        map.set(catName, { name: catName, planned: 0, actual: 0, items: [] })
      }
      const row = map.get(catName)!
      row.actual += item.amount
      row.items.push(item)
    })

    return Array.from(map.values()).sort((a, b) => b.actual - a.actual) // Sort by highest actual spend
  }

  const incomeCategories = aggregateByCategory(plannedIncomeItems, actualIncomeItems)
  const expenseCategories = aggregateByCategory(plannedExpenseItems, actualExpenseItems)

  const renderCategoryTable = (title: string, categories: CategoryRow[], isIncome: boolean) => (
    <div className={styles.section}>
      <h4 className={styles.title}>
        {title}
      </h4>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.theadRow}>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Planned</th>
              <th style={{ textAlign: 'right' }}>Actual</th>
              <th style={{ textAlign: 'right' }}>Diff</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, idx) => {
              const diff = cat.actual - cat.planned
              // For income: Actual > Planned is Good (Green)
              // For expense: Actual < Planned is Good (Green)
              const isGood = isIncome ? diff >= 0 : diff <= 0
              // Only highlight if there is a difference
              const diffClass = diff === 0 ? styles.textMuted : (isGood ? styles.textSuccess : styles.textError)

              return (
                <tr key={idx} className={styles.row}>
                  <td className={styles.cell}>{cat.name}</td>
                  <td className={styles.cellMuted}>{formatCurrency(cat.planned)}</td>
                  <td className={styles.cellRight}>{formatCurrency(cat.actual)}</td>
                  <td className={`${styles.diffCell} ${diffClass}`}>
                    {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                  </td>
                </tr>
              )
            })}
             {categories.length === 0 && (
                <tr>
                    <td colSpan={4} className={styles.emptyState}>No categories found</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className={styles.container}>
         {/* The table focuses on category-level comparisons for plan vs. actual spending. */}
         {renderCategoryTable('Expense Categories', expenseCategories, false)}
         {renderCategoryTable('Income Categories', incomeCategories, true)}
    </div>
  )
}
