import { FrontendToolbar } from '@/app/(frontend)/_components/FrontendToolbar'
import { getFrontendDashboardData } from '@/app/(frontend)/_lib/dashboard'
import type { FrontendPlannedItem, FrontendTransactionRow } from '@/app/(frontend)/_lib/dashboard'
import type { ActivityRow } from '@/app/(frontend)/spending/_components/SpendingActivity'
import { SpendingActivity } from '@/app/(frontend)/spending/_components/SpendingActivity'
import { formatCurrency, formatDate } from '@/shared/formatting'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function buildFeed(
  transactions: FrontendTransactionRow[],
  pending: FrontendPlannedItem[],
): ActivityRow[] {
  const rows: ActivityRow[] = [
    ...transactions.map((t) => ({ kind: 'transaction' as const, item: t })),
    ...pending.map((p) => ({ kind: 'pending' as const, item: p })),
  ]
  return rows.sort((a, b) => {
    const aDate =
      a.kind === 'transaction' ? a.item.date : (a.item.dueDate ?? new Date().toISOString())
    const bDate =
      b.kind === 'transaction' ? b.item.date : (b.item.dueDate ?? new Date().toISOString())
    return new Date(aDate).getTime() - new Date(bDate).getTime()
  })
}

export default async function SpendingPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const searchParams = props.searchParams ? await props.searchParams : {}
  const data = await getFrontendDashboardData({
    accountId: searchParams.account,
    budgetId: searchParams.budget,
    transactionLimit: 50,
  })

  if (data.accounts.length === 0) {
    return (
      <div className="budget-shell">
        <p className="budget-copy">
          No accounts found. <Link href="/admin">Set up an account in admin first.</Link>
        </p>
      </div>
    )
  }

  const proj = data.projection
  const actualIncome = proj
    ? proj.items.income.filter((i) => i.isActual).reduce((s, i) => s + i.amount, 0)
    : 0
  const actualExpenses = proj
    ? proj.items.expenses.filter((i) => i.isActual).reduce((s, i) => s + i.amount, 0)
    : 0
  const plannedIncome = proj ? proj.income : 0
  const plannedExpenses = proj ? proj.expenses : 0
  const net = actualIncome - actualExpenses
  const incomeProgress = plannedIncome > 0 ? Math.min((actualIncome / plannedIncome) * 100, 100) : 0
  const expenseProgress =
    plannedExpenses > 0 ? Math.min((actualExpenses / plannedExpenses) * 100, 100) : 0

  const feed = buildFeed(data.recentTransactions, data.upcomingItems)

  return (
    <div className="budget-shell">
      <section className="budget-hero">
        <div>
          <p className="budget-kicker">{data.selectedAccount?.name}</p>
          <h1 className="budget-title">Transactions</h1>
          <p className="budget-copy">
            {data.selectedBudget
              ? data.selectedBudget.name
              : 'All recorded transactions for this account.'}
          </p>
        </div>
        <FrontendToolbar
          accounts={data.accounts}
          budgets={data.budgets}
          selectedAccountId={data.selectedAccount?.id}
          selectedBudgetId={data.selectedBudget?.id}
          transactionOptions={data.transactionOptions}
        />
      </section>

      {proj && (
        <section className="sp-summary">
          <div className="sp-stat">
            <span className="sp-stat-label">Net this period</span>
            <strong className={`sp-stat-value ${net >= 0 ? 'is-positive' : 'is-negative'}`}>
              {net >= 0 ? '+' : ''}
              {formatCurrency(net)}
            </strong>
          </div>
          <div className="sp-stat">
            <span className="sp-stat-label">Income</span>
            <strong className="sp-stat-value is-positive">{formatCurrency(actualIncome)}</strong>
            <span className="sp-stat-sub">of {formatCurrency(plannedIncome)} planned</span>
            <div className="sp-mini-bar">
              <span className="sp-mini-fill-income" style={{ width: `${incomeProgress}%` }} />
            </div>
          </div>
          <div className="sp-stat">
            <span className="sp-stat-label">Expenses</span>
            <strong className="sp-stat-value is-negative">{formatCurrency(actualExpenses)}</strong>
            <span className="sp-stat-sub">of {formatCurrency(plannedExpenses)} budgeted</span>
            <div className="sp-mini-bar">
              <span className="sp-mini-fill-expense" style={{ width: `${expenseProgress}%` }} />
            </div>
          </div>
          <div className="sp-stat">
            <span className="sp-stat-label">Still to record</span>
            <strong className="sp-stat-value">{data.upcomingItems.length}</strong>
            <span className="sp-stat-sub">recurring items</span>
          </div>
        </section>
      )}

      <section className="sp-layout">
        <SpendingActivity
          rows={feed}
          openingBalance={proj?.startingBalance ?? null}
          budgetId={data.selectedBudget?.id}
        />

        <div className="sp-sidebar">
          {proj && (
            <div className="sp-card">
              <p className="sp-card-title">Recurring this period</p>
              <div className={`sp-net ${net >= 0 ? 'is-positive' : 'is-negative'}`}>
                Net {net >= 0 ? '+' : ''}
                {formatCurrency(net)}
              </div>
              <div className="sp-recurring-row">
                <div className="sp-recurring-label">
                  <span>Income</span>
                  <span>
                    <span className="is-positive">{formatCurrency(actualIncome)}</span>
                    <span className="sp-of"> / {formatCurrency(plannedIncome)}</span>
                  </span>
                </div>
                <div className="sp-recurring-bar">
                  <div
                    className="sp-recurring-fill-income"
                    style={{ width: `${incomeProgress}%` }}
                  />
                </div>
              </div>
              <div className="sp-recurring-row">
                <div className="sp-recurring-label">
                  <span>Expenses</span>
                  <span>
                    <span className="is-negative">{formatCurrency(actualExpenses)}</span>
                    <span className="sp-of"> / {formatCurrency(plannedExpenses)}</span>
                  </span>
                </div>
                <div className="sp-recurring-bar">
                  <div
                    className="sp-recurring-fill-expense"
                    style={{ width: `${expenseProgress}%` }}
                  />
                </div>
              </div>
              {data.upcomingItems.length > 0 && (
                <>
                  <p className="sp-sub-heading">Upcoming</p>
                  <div className="sp-item-list">
                    {data.upcomingItems.slice(0, 10).map((item) => (
                      <div key={`sidebar-${item.id}`} className="sp-item">
                        <div>
                          <div className="sp-item-name">{item.name}</div>
                          <div className="sp-item-meta">
                            {item.dueDate ? `Due ${formatDate(item.dueDate)}` : 'This period'}
                            {item.categoryName ? ` · ${item.categoryName}` : ''}
                          </div>
                        </div>
                        <strong
                          className={item.direction === 'out' ? 'is-negative' : 'is-positive'}
                        >
                          {item.direction === 'out' ? '-' : '+'}
                          {formatCurrency(item.amount)}
                        </strong>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {data.categoryBreakdown.length > 0 && (
            <div className="sp-card">
              <p className="sp-card-title">Categories</p>
              <div className="sp-cat-list">
                {data.categoryBreakdown.map((cat) => {
                  const maxVal = Math.max(cat.planned, cat.actual, 1)
                  return (
                    <div key={cat.name} className="sp-cat-row">
                      <div className="sp-cat-name-row">
                        <span>{cat.name}</span>
                        <span className={cat.delta > 0 ? 'is-negative' : ''}>
                          {formatCurrency(cat.actual)}
                        </span>
                      </div>
                      <div className="sp-cat-track">
                        <div
                          className="sp-cat-plan"
                          style={{ width: `${(cat.planned / maxVal) * 100}%` }}
                        />
                        <div
                          className="sp-cat-actual"
                          style={{ width: `${(cat.actual / maxVal) * 100}%` }}
                        />
                      </div>
                      <div className="sp-item-meta">Planned {formatCurrency(cat.planned)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
