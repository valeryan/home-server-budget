import { calculateBudgetProjection } from '@/domain/budgets/calculateProjection'
import type { BudgetItem, TransferItem } from '@/domain/budgets/types'
import { applyMatchRules } from '@/domain/matching/applyRules'
import { autoAdvanceBudgets } from '@/domain/budgets/autoAdvance'
import { getPayloadClient } from '@/payload/client'

type NamedRelation = { id: string; name?: string } | string | null | undefined
type SearchValue = string | string[] | undefined

export interface FrontendAccountOption {
  id: string
  name: string
  accountType: string
  currentBalance: number
  isDefault: boolean
}

export interface FrontendBudgetOption {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'planning' | 'active' | 'closed'
}

export interface FrontendTransactionOption {
  id: string
  name: string
}

export interface FrontendTransactionRow {
  id: string
  date: string
  description: string
  displayTitle: string | null
  type: 'income' | 'expense' | 'transfer'
  direction: 'in' | 'out'
  amount: number
  signedAmount: number
  categoryName: string | null
  payeeName: string | null
  otherAccountName: string | null
  notes: string | null
  syncSource: 'manual' | 'teller' | null
}

export interface FrontendPlannedItem {
  id: string
  kind: 'income' | 'expense' | 'transfer'
  direction: 'in' | 'out'
  name: string
  amount: number
  dueDate: string | null | undefined
  categoryName: string | null
  payeeName: string | null
  otherAccountName: string | null
}

export interface FrontendCategoryBreakdown {
  name: string
  planned: number
  actual: number
  delta: number
}

export interface FrontendTrendPoint {
  label: string
  income: number
  expenses: number
}

export interface FrontendSetupStatus {
  incomeCategories: number
  expenseCategories: number
  payees: number
  accounts: number
  recurringItems: number
}

export interface FrontendDashboardData {
  wizardComplete: boolean
  setupStatus: FrontendSetupStatus
  accounts: FrontendAccountOption[]
  budgets: FrontendBudgetOption[]
  selectedAccount: FrontendAccountOption | null
  selectedBudget: FrontendBudgetOption | null
  projection: Awaited<ReturnType<typeof calculateBudgetProjection>> | null
  monthlySnapshot: {
    income: number
    spend: number
    net: number
  }
  recentTransactions: FrontendTransactionRow[]
  upcomingItems: FrontendPlannedItem[]
  categoryBreakdown: FrontendCategoryBreakdown[]
  trend: FrontendTrendPoint[]
  transactionOptions: {
    incomeCategories: FrontendTransactionOption[]
    expenseCategories: FrontendTransactionOption[]
    payees: FrontendTransactionOption[]
    accounts: FrontendAccountOption[]
  }
}

function getFirstSearchValue(value: SearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function getRelationId(value: NamedRelation): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

function getRelationName(value: NamedRelation): string | null {
  if (!value || typeof value === 'string') return null
  return value.name || null
}

function getStartOfMonth() {
  const date = new Date()
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0))
}

function getEndOfMonth(startOfMonth: Date) {
  return new Date(
    Date.UTC(startOfMonth.getUTCFullYear(), startOfMonth.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  )
}

function getTrendLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short' })
}

function asCurrencyOption(doc: { id: string; name: string }) {
  return { id: doc.id, name: doc.name }
}

function buildCategoryBreakdown(
  plannedItems: BudgetItem[],
  actualItems: BudgetItem[],
): FrontendCategoryBreakdown[] {
  const map = new Map<string, FrontendCategoryBreakdown>()

  plannedItems.forEach((item) => {
    const key = item.categoryName || 'Uncategorized'
    const current = map.get(key) || { name: key, planned: 0, actual: 0, delta: 0 }
    current.planned += item.amount
    current.delta = current.actual - current.planned
    map.set(key, current)
  })

  actualItems.forEach((item) => {
    const key = item.categoryName || 'Uncategorized'
    const current = map.get(key) || { name: key, planned: 0, actual: 0, delta: 0 }
    current.actual += item.amount
    current.delta = current.actual - current.planned
    map.set(key, current)
  })

  return Array.from(map.values()).sort((left, right) => right.actual - left.actual)
}

function buildUpcomingItems(
  incomeItems: BudgetItem[],
  expenseItems: BudgetItem[],
  transferItems: TransferItem[],
): FrontendPlannedItem[] {
  return [
    ...incomeItems
      .filter((item) => !item.isActual)
      .map((item) => ({
        id: item.id,
        kind: 'income' as const,
        direction: 'in' as const,
        name: item.name,
        amount: item.amount,
        dueDate: item.dueDate,
        categoryName: item.categoryName,
        payeeName: item.payeeName,
        otherAccountName: null,
      })),
    ...expenseItems
      .filter((item) => !item.isActual)
      .map((item) => ({
        id: item.id,
        kind: 'expense' as const,
        direction: 'out' as const,
        name: item.name,
        amount: item.amount,
        dueDate: item.dueDate,
        categoryName: item.categoryName,
        payeeName: item.payeeName,
        otherAccountName: null,
      })),
    ...transferItems
      .filter((item) => !item.isActual)
      .map((item) => ({
        id: item.id,
        kind: 'transfer' as const,
        direction: item.direction,
        name: item.name,
        amount: item.amount,
        dueDate: item.dueDate,
        categoryName: null,
        payeeName: null,
        otherAccountName: item.otherAccountName,
      })),
  ].sort((left, right) => {
    const leftDate = left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER
    const rightDate = right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER
    return leftDate - rightDate
  })
}

function mapTransactionForAccount(
  transaction: {
    id: string
    date: string
    description: string
    displayTitle?: string | null
    amount: number
    type: 'income' | 'expense' | 'transfer'
    notes?: string | null
    syncSource?: string | null
    account?: NamedRelation
    payee?: NamedRelation
    incomeDetails?: { category?: NamedRelation; payee?: NamedRelation }
    expenseDetails?: { category?: NamedRelation; payee?: NamedRelation }
    transferDetails?: { toAccount?: NamedRelation }
  },
  accountId: string,
): FrontendTransactionRow {
  const destinationAccountId = getRelationId(transaction.transferDetails?.toAccount)

  if (transaction.type === 'income') {
    return {
      id: transaction.id,
      date: transaction.date,
      description: transaction.description,
      displayTitle: transaction.displayTitle || null,
      type: transaction.type,
      direction: 'in',
      amount: transaction.amount,
      signedAmount: transaction.amount,
      categoryName: getRelationName(transaction.incomeDetails?.category),
      payeeName:
        getRelationName(transaction.incomeDetails?.payee) ?? getRelationName(transaction.payee),
      otherAccountName: null,
      notes: transaction.notes || null,
      syncSource: (transaction.syncSource as 'manual' | 'teller') || null,
    }
  }

  if (transaction.type === 'expense') {
    return {
      id: transaction.id,
      date: transaction.date,
      description: transaction.description,
      displayTitle: transaction.displayTitle || null,
      type: transaction.type,
      direction: 'out',
      amount: transaction.amount,
      signedAmount: -transaction.amount,
      categoryName: getRelationName(transaction.expenseDetails?.category),
      payeeName:
        getRelationName(transaction.expenseDetails?.payee) ?? getRelationName(transaction.payee),
      otherAccountName: null,
      notes: transaction.notes || null,
      syncSource: (transaction.syncSource as 'manual' | 'teller') || null,
    }
  }

  const incoming = destinationAccountId === accountId

  return {
    id: transaction.id,
    date: transaction.date,
    description: transaction.description,
    displayTitle: transaction.displayTitle || null,
    type: transaction.type,
    direction: incoming ? 'in' : 'out',
    amount: transaction.amount,
    signedAmount: incoming ? transaction.amount : -transaction.amount,
    categoryName: null,
    payeeName: null,
    otherAccountName: incoming
      ? getRelationName(transaction.account)
      : getRelationName(transaction.transferDetails?.toAccount),
    notes: transaction.notes || null,
    syncSource: (transaction.syncSource as 'manual' | 'teller') || null,
  }
}

async function getSetupStatus() {
  const payload = await getPayloadClient()
  const [incomeCategories, expenseCategories, payees, accounts, recurringItems, settings] =
    await Promise.all([
      payload.find({ collection: 'income-categories', limit: 0 }),
      payload.find({ collection: 'expense-categories', limit: 0 }),
      payload.find({ collection: 'payees', limit: 0 }),
      payload.find({ collection: 'accounts', limit: 0 }),
      payload.find({ collection: 'recurring-items', limit: 0 }),
      payload.find({ collection: 'app-settings', limit: 1 }),
    ])

  return {
    wizardComplete: Boolean(settings.docs[0]?.wizardComplete),
    setupStatus: {
      incomeCategories: incomeCategories.totalDocs,
      expenseCategories: expenseCategories.totalDocs,
      payees: payees.totalDocs,
      accounts: accounts.totalDocs,
      recurringItems: recurringItems.totalDocs,
    },
  }
}

async function getTransactionOptions() {
  const payload = await getPayloadClient()
  const [incomeCategories, expenseCategories, payees, accounts] = await Promise.all([
    payload.find({ collection: 'income-categories', sort: 'name', limit: 200 }),
    payload.find({ collection: 'expense-categories', sort: 'name', limit: 200 }),
    payload.find({ collection: 'payees', sort: 'name', limit: 200 }),
    payload.find({ collection: 'accounts', sort: 'name', limit: 200 }),
  ])

  return {
    incomeCategories: incomeCategories.docs.map(asCurrencyOption),
    expenseCategories: expenseCategories.docs.map(asCurrencyOption),
    payees: payees.docs.map(asCurrencyOption),
    accounts: accounts.docs.map((account) => ({
      id: account.id,
      name: account.name,
      accountType: account.accountType,
      currentBalance: account.currentBalance || 0,
      isDefault: Boolean(account.isDefault),
    })),
  }
}

export async function getFrontendDashboardData(args?: {
  accountId?: SearchValue
  budgetId?: SearchValue
  transactionLimit?: number
}): Promise<FrontendDashboardData> {
  const payload = await getPayloadClient()
  const [{ wizardComplete, setupStatus }, transactionOptions, accountsResult] = await Promise.all([
    getSetupStatus(),
    getTransactionOptions(),
    payload.find({ collection: 'accounts', sort: 'name', limit: 100 }),
  ])

  const accounts = accountsResult.docs.map((account) => ({
    id: account.id,
    name: account.name,
    accountType: account.accountType,
    currentBalance: account.currentBalance || 0,
    isDefault: Boolean(account.isDefault),
  }))

  // Selection priority: explicit URL param > marked default > highest balance
  const requestedId = getFirstSearchValue(args?.accountId)
  const selectedAccount =
    accounts.find((a) => a.id === requestedId) ||
    accounts.find((a) => a.isDefault) ||
    [...accounts].sort((a, b) => b.currentBalance - a.currentBalance)[0] ||
    null

  if (!selectedAccount) {
    return {
      wizardComplete,
      setupStatus,
      accounts,
      budgets: [],
      selectedAccount: null,
      selectedBudget: null,
      projection: null,
      monthlySnapshot: { income: 0, spend: 0, net: 0 },
      recentTransactions: [],
      upcomingItems: [],
      categoryBreakdown: [],
      trend: [],
      transactionOptions,
    }
  }

  // Run auto-advance only if there is no active budget covering today — avoids
  // creating extra planning periods on every page load.
  const now = new Date()
  const existingBudgetsCheck = await payload.find({
    collection: 'budgets',
    where: {
      and: [{ account: { equals: selectedAccount.id } }, { status: { equals: 'active' } }],
    },
    limit: 1,
  })
  const hasActiveBudget = existingBudgetsCheck.totalDocs > 0
  const activeCoversToday =
    hasActiveBudget &&
    new Date(existingBudgetsCheck.docs[0].startDate) <= now &&
    new Date(existingBudgetsCheck.docs[0].endDate) >= now

  if (!activeCoversToday) {
    await autoAdvanceBudgets(payload, selectedAccount.id)
  }

  const budgetsResult = await payload.find({
    collection: 'budgets',
    where: { account: { equals: selectedAccount.id } },
    sort: '-startDate',
    limit: 100,
  })

  const budgets = budgetsResult.docs
    .map((budget) => ({
      id: budget.id,
      name: budget.name,
      startDate: budget.startDate,
      endDate: budget.endDate,
      status: budget.status,
    }))
    .reverse() // keep chronological order for display

  const selectedBudget =
    budgets.find((budget) => budget.id === getFirstSearchValue(args?.budgetId)) ||
    budgets.find((budget) => budget.status === 'active') ||
    [...budgets].reverse().find((budget) => budget.status === 'closed') ||
    null

  const projection = selectedBudget
    ? await calculateBudgetProjection(payload, {
        accountId: selectedAccount.id,
        budgetId: selectedBudget.id,
        startDate: selectedBudget.startDate,
        endDate: selectedBudget.endDate,
      })
    : null

  const transactionLimit = args?.transactionLimit || 8
  const startOfMonth = getStartOfMonth()
  const endOfMonth = getEndOfMonth(startOfMonth)
  const trendStart = new Date(
    Date.UTC(startOfMonth.getUTCFullYear(), startOfMonth.getUTCMonth() - 5, 1, 0, 0, 0, 0),
  )

  // When a budget is selected, scope transactions to that period only.
  // Extract the calendar date (UTC) from whatever was stored and rebuild as
  // UTC midnight so browser-timezone offsets in stored dates don't shift boundaries.
  const toUtcDayStart = (iso: string) => {
    const d = new Date(iso)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString()
  }
  const toUtcDayEnd = (iso: string) => {
    const d = new Date(iso)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)).toISOString()
  }

  const budgetStart = selectedBudget ? toUtcDayStart(selectedBudget.startDate) : null
  const budgetEnd = selectedBudget ? toUtcDayEnd(selectedBudget.endDate) : null

  // Apply active match rules before fetching transactions so the displayed
  // budget period uses the latest rule matches.
  if (budgetStart && budgetEnd) {
    await applyMatchRules(payload, selectedAccount.id, budgetStart, budgetEnd)
  }

  const [recentTransactionsResult, monthlyTransactionsResult, trendTransactionsResult] =
    await Promise.all([
      payload.find({
        collection: 'transactions',
        where: {
          and: [
            ...(budgetStart && budgetEnd
              ? [
                  { date: { greater_than_equal: budgetStart } },
                  { date: { less_than_equal: budgetEnd } },
                ]
              : []),
            {
              or: [
                { account: { equals: selectedAccount.id } },
                { 'transferDetails.toAccount': { equals: selectedAccount.id } },
              ],
            },
          ],
        },
        sort: 'date',
        depth: 1,
        limit: selectedBudget ? 1000 : transactionLimit,
      }),
      payload.find({
        collection: 'transactions',
        where: {
          and: [
            { date: { greater_than_equal: startOfMonth.toISOString() } },
            { date: { less_than_equal: endOfMonth.toISOString() } },
            {
              or: [
                { account: { equals: selectedAccount.id } },
                { 'transferDetails.toAccount': { equals: selectedAccount.id } },
              ],
            },
          ],
        },
        depth: 1,
        limit: 500,
      }),
      payload.find({
        collection: 'transactions',
        where: {
          and: [
            { date: { greater_than_equal: trendStart.toISOString() } },
            {
              or: [
                { account: { equals: selectedAccount.id } },
                { 'transferDetails.toAccount': { equals: selectedAccount.id } },
              ],
            },
          ],
        },
        depth: 1,
        limit: 1000,
      }),
    ])

  const recentTransactions = recentTransactionsResult.docs.map((transaction) =>
    mapTransactionForAccount(transaction, selectedAccount.id),
  )

  const monthlySnapshot = monthlyTransactionsResult.docs.reduce(
    (snapshot, transaction) => {
      if (transaction.type === 'income') {
        snapshot.income += transaction.amount
        snapshot.net += transaction.amount
      } else if (transaction.type === 'expense') {
        snapshot.spend += transaction.amount
        snapshot.net -= transaction.amount
      }

      return snapshot
    },
    { income: 0, spend: 0, net: 0 },
  )

  const trendMap = new Map<string, FrontendTrendPoint>()
  for (let index = 0; index < 6; index++) {
    const date = new Date(
      Date.UTC(
        startOfMonth.getUTCFullYear(),
        startOfMonth.getUTCMonth() - (5 - index),
        1,
        0,
        0,
        0,
        0,
      ),
    )
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`
    trendMap.set(key, { label: getTrendLabel(date), income: 0, expenses: 0 })
  }

  trendTransactionsResult.docs.forEach((transaction) => {
    const date = new Date(transaction.date)
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`
    const row = trendMap.get(key)
    if (!row) return

    if (transaction.type === 'income') {
      row.income += transaction.amount
    }

    if (transaction.type === 'expense') {
      row.expenses += transaction.amount
    }
  })

  return {
    wizardComplete,
    setupStatus,
    accounts,
    budgets,
    selectedAccount,
    selectedBudget,
    projection,
    monthlySnapshot,
    recentTransactions,
    upcomingItems: projection
      ? buildUpcomingItems(
          projection.items.income,
          projection.items.expenses,
          projection.items.transfers,
        )
      : [],
    categoryBreakdown: projection
      ? buildCategoryBreakdown(
          projection.plannedItems.expenses,
          projection.items.expenses.filter((item) => item.isActual),
        )
      : [],
    trend: Array.from(trendMap.values()),
    transactionOptions,
  }
}
