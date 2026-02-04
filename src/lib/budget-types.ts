export interface BudgetAutomation {
  id: string
  name: string
  account: {
    id: string
    name: string
    accountType: string
    currentBalance: number
  }
  scheduleType: string
  isActive: boolean
}

export interface Budget {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'planning' | 'active' | 'closed'
}

export interface BaseItem {
  id: string
  name: string
  amount: number
  dueDate?: string | null
  isActual?: boolean
}

export interface BudgetItem extends BaseItem {
  categoryId: string | null
  categoryName: string | null
  payeeId: string | null
  payeeName: string | null
}

export interface TransferItem extends BaseItem {
  direction: 'in' | 'out'
  otherAccountId: string | null
  otherAccountName: string | null
}

export type TransactionItem = BudgetItem | TransferItem

export interface BudgetProjection {
  startingBalance: number
  currentAccountBalance: number
  income: number
  expenses: number
  projectedBalance: number
  incomeCount: number
  expenseCount: number
  transferInCount: number
  transferOutCount: number
  items: {
    income: BudgetItem[]
    expenses: BudgetItem[]
    transfers: TransferItem[]
  }
}
