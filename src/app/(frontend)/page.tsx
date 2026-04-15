import { FrontendToolbar } from '@/app/(frontend)/_components/FrontendToolbar'
import { UpcomingItemsCard } from '@/app/(frontend)/_components/UpcomingItemsCard'
import { getFrontendDashboardData } from '@/app/(frontend)/_lib/dashboard'
import { formatCurrency, formatDate } from '@/shared/formatting'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function renderSetupPage(data: Awaited<ReturnType<typeof getFrontendDashboardData>>) {
  const setupCards = [
    ['Income Categories', data.setupStatus.incomeCategories],
    ['Expense Categories', data.setupStatus.expenseCategories],
    ['Payees', data.setupStatus.payees],
    ['Accounts', data.setupStatus.accounts],
    ['Recurring Items', data.setupStatus.recurringItems],
  ]

  return (
    <div className="budget-shell">
      <section className="budget-hero budget-hero-wide">
        <div>
          <p className="budget-kicker">Household Budget</p>
          <h1 className="budget-title">
            Run the budget here. Use admin for setup and maintenance.
          </h1>
          <p className="budget-copy">
            The frontend is ready, but the household setup is not complete yet. Finish the wizard in
            admin, then this dashboard becomes the day-to-day budgeting surface.
          </p>
          <div className="budget-hero-actions">
            <Link className="budget-button" href="/admin">
              Continue Setup
            </Link>
            <Link className="budget-button-secondary" href="/admin/collections/accounts">
              Manage Accounts
            </Link>
          </div>
        </div>
        <div className="budget-card budget-card-glow">
          <p className="budget-section-label">Setup Progress</p>
          <div className="budget-progress-grid">
            {setupCards.map(([label, value]) => (
              <div key={label} className="budget-stat-card">
                <span className="budget-stat-label">{label}</span>
                <strong className="budget-stat-value">{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function getBudgetRemaining(data: Awaited<ReturnType<typeof getFrontendDashboardData>>) {
  if (!data.projection) return 0
  const plannedExpenses = data.projection.plannedItems.expenses.reduce(
    (sum, item) => sum + item.amount,
    0,
  )
  const actualExpenses = data.projection.items.expenses
    .filter((item) => item.isActual)
    .reduce((sum, item) => sum + item.amount, 0)
  return plannedExpenses - actualExpenses
}

export default async function HomePage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const searchParams = props.searchParams ? await props.searchParams : {}
  const data = await getFrontendDashboardData({
    accountId: searchParams.account,
    budgetId: searchParams.budget,
    transactionLimit: 8,
  })

  // Show setup page only if there are genuinely no accounts — wizardComplete flag
  // can be missing on existing installs where data was created via admin directly.
  if (data.accounts.length === 0) {
    return renderSetupPage(data)
  }

  // No budget periods for this account yet
  if (!data.selectedBudget) {
    return (
      <div className="budget-shell">
        <section className="budget-hero">
          <div>
            <p className="budget-kicker">{data.selectedAccount?.name}</p>
            <h1 className="budget-title">No budget period defined.</h1>
            <p className="budget-copy">
              This account has no budget periods or schedules yet. Create a budget schedule in admin
              to get started.
            </p>
            <div className="budget-hero-actions">
              <Link className="budget-button" href="/admin/collections/budget-schedules">
                Create Budget Schedule
              </Link>
              <Link className="budget-button-secondary" href="/admin/collections/budgets">
                Add Budget Period Manually
              </Link>
            </div>
          </div>
          <FrontendToolbar
            accounts={data.accounts}
            budgets={data.budgets}
            selectedAccountId={data.selectedAccount?.id}
            selectedBudgetId={null}
            transactionOptions={data.transactionOptions}
          />
        </section>
      </div>
    )
  }

  const budgetRemaining = getBudgetRemaining(data)
  const trendMax = Math.max(...data.trend.map((item) => Math.max(item.income, item.expenses)), 1)

  return (
    <div className="budget-shell">
      <section className="budget-hero">
        <div>
          <p className="budget-kicker">{data.selectedAccount?.name}</p>
          <h1 className="budget-title">
            {data.selectedBudget ? data.selectedBudget.name : 'No budget period'}
          </h1>
          <p className="budget-copy">
            {data.selectedBudget
              ? `${formatDate(data.selectedBudget.startDate)} — ${formatDate(data.selectedBudget.endDate)}`
              : 'No budget period exists for this account. Create one in the admin to start tracking.'}
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

      <section className="budget-stats-grid">
        <article className="budget-stat-card budget-card-glow">
          <span className="budget-stat-label">Current Balance</span>
          <strong className="budget-stat-value">
            {formatCurrency(data.selectedAccount?.currentBalance || 0)}
          </strong>
        </article>
        <article className="budget-stat-card">
          <span className="budget-stat-label">Spend This Month</span>
          <strong className="budget-stat-value">
            {formatCurrency(data.monthlySnapshot.spend)}
          </strong>
        </article>
        <article className="budget-stat-card">
          <span className="budget-stat-label">Income This Month</span>
          <strong className="budget-stat-value">
            {formatCurrency(data.monthlySnapshot.income)}
          </strong>
        </article>
        <article className="budget-stat-card">
          <span className="budget-stat-label">Projected End</span>
          <strong className="budget-stat-value">
            {formatCurrency(data.projection?.projectedBalance || 0)}
          </strong>
        </article>
        <article className="budget-stat-card">
          <span className="budget-stat-label">Budget Remaining</span>
          <strong className={`budget-stat-value ${budgetRemaining < 0 ? 'is-negative' : ''}`}>
            {formatCurrency(budgetRemaining)}
          </strong>
        </article>
      </section>

      <section className="budget-grid budget-grid-overview">
        <article className="budget-card budget-card-large">
          <div className="budget-card-header">
            <div>
              <p className="budget-section-label">Budget vs Actual</p>
              <h2 className="budget-section-title">Current period snapshot</h2>
            </div>
            {data.selectedBudget ? (
              <span className="budget-pill">{data.selectedBudget.status}</span>
            ) : null}
          </div>

          <div className="budget-split-metrics">
            <div>
              <span className="budget-metric-label">Starting Balance</span>
              <strong className="budget-metric-value">
                {formatCurrency(data.projection?.startingBalance || 0)}
              </strong>
            </div>
            <div>
              <span className="budget-metric-label">Planned Income</span>
              <strong className="budget-metric-value">
                {formatCurrency(
                  data.projection?.plannedItems.income.reduce(
                    (sum, item) => sum + item.amount,
                    0,
                  ) || 0,
                )}
              </strong>
            </div>
            <div>
              <span className="budget-metric-label">Planned Expenses</span>
              <strong className="budget-metric-value">
                {formatCurrency(
                  data.projection?.plannedItems.expenses.reduce(
                    (sum, item) => sum + item.amount,
                    0,
                  ) || 0,
                )}
              </strong>
            </div>
            <div>
              <span className="budget-metric-label">Actual Expenses</span>
              <strong className="budget-metric-value">
                {formatCurrency(
                  data.projection?.items.expenses
                    .filter((item) => item.isActual)
                    .reduce((sum, item) => sum + item.amount, 0) || 0,
                )}
              </strong>
            </div>
          </div>

          <div className="budget-trend-grid">
            {data.trend.map((point) => (
              <div key={point.label} className="budget-trend-bar">
                <div className="budget-trend-stack">
                  <span
                    className="budget-trend-income"
                    style={{ height: `${(point.income / trendMax) * 100}%` }}
                  />
                  <span
                    className="budget-trend-expense"
                    style={{ height: `${(point.expenses / trendMax) * 100}%` }}
                  />
                </div>
                <span className="budget-trend-label">{point.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="budget-card">
          <div className="budget-card-header">
            <div>
              <p className="budget-section-label">Recent Transactions</p>
              <h2 className="budget-section-title">Latest account activity</h2>
            </div>
            <Link
              className="budget-text-link"
              href={
                data.selectedAccount
                  ? `/spending?account=${data.selectedAccount.id}${data.selectedBudget ? `&budget=${data.selectedBudget.id}` : ''}`
                  : '/spending'
              }
            >
              Open spending view
            </Link>
          </div>
          <div className="budget-list">
            {data.recentTransactions.map((transaction) => (
              <div key={transaction.id} className="budget-row-card">
                <div>
                  <strong>{transaction.description}</strong>
                  <div className="budget-row-meta">
                    {formatDate(transaction.date)}
                    {transaction.categoryName ? ` • ${transaction.categoryName}` : ''}
                    {transaction.payeeName ? ` • ${transaction.payeeName}` : ''}
                    {transaction.otherAccountName ? ` • ${transaction.otherAccountName}` : ''}
                  </div>
                </div>
                <strong className={transaction.signedAmount < 0 ? 'is-negative' : 'is-positive'}>
                  {transaction.signedAmount < 0 ? '-' : '+'}
                  {formatCurrency(Math.abs(transaction.signedAmount))}
                </strong>
              </div>
            ))}
          </div>
        </article>

        <article className="budget-card">
          <div className="budget-card-header">
            <div>
              <p className="budget-section-label">Category Breakdown</p>
              <h2 className="budget-section-title">Plan against actual expense categories</h2>
            </div>
          </div>

          <div className="budget-list">
            {data.categoryBreakdown.slice(0, 6).map((category) => {
              const max = Math.max(category.planned, category.actual, 1)
              return (
                <div key={category.name} className="budget-category-row">
                  <div className="budget-category-header">
                    <strong>{category.name}</strong>
                    <span className={category.delta > 0 ? 'is-negative' : 'is-positive'}>
                      {category.delta > 0 ? '+' : ''}
                      {formatCurrency(category.delta)}
                    </span>
                  </div>
                  <div className="budget-bar-track">
                    <span
                      className="budget-bar-plan"
                      style={{ width: `${(category.planned / max) * 100}%` }}
                    />
                    <span
                      className="budget-bar-actual"
                      style={{ width: `${(category.actual / max) * 100}%` }}
                    />
                  </div>
                  <div className="budget-row-meta">
                    Planned {formatCurrency(category.planned)} • Actual{' '}
                    {formatCurrency(category.actual)}
                  </div>
                </div>
              )
            })}
          </div>
        </article>

        <article className="budget-card">
          <div className="budget-card-header">
            <div>
              <p className="budget-section-label">Upcoming Recurring</p>
              <h2 className="budget-section-title">Record what is still left in this period</h2>
            </div>
          </div>
          <UpcomingItemsCard
            budgetId={data.selectedBudget?.id}
            items={data.upcomingItems.slice(0, 8)}
          />
        </article>
      </section>
    </div>
  )
}
