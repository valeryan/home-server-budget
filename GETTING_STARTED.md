# Getting Started with Your Budget App

## Next Steps

### 1. Start the Development Server
```bash
pnpm dev
```

### 2. Set Up Initial Data

Navigate to the Payload admin panel (typically `http://localhost:3000/admin`) and add:

#### a. Schedules (Add these first)
Go to Collections → Schedules and add:
- Weekly
- Bi-weekly
- Monthly
- (See `src/seed-data.ts` for complete list)

#### b. Categories
- Go to Income Categories and add: Regular Pay, Bonus, Investment Income, etc.
- Go to Expense Categories and add: Food, Utilities, Housing, Transportation, etc.
- (See `src/seed-data.ts` for complete list)

#### c. Payees
Add people and companies you deal with:
- Your employer
- Landlord
- Utility companies
- Stores you shop at

#### d. Accounts
Add your financial accounts:
- Checking account(s)
- Savings account(s)
- Credit card(s)

### 3. Create Your Budget Templates

#### Income Templates
Create templates for recurring income:
1. Go to Income Templates
2. Add your paycheck (name, amount, category, payee, schedule, account)
3. Add any other recurring income

#### Expense Templates
Create templates for recurring expenses:
1. Go to Expense Templates
2. Add rent/mortgage
3. Add utilities
4. Add subscriptions
5. Add any other regular expenses

#### Transfer Templates (Optional)
If you regularly transfer money between accounts:
1. Go to Transfer Templates
2. Add savings transfers
3. Add other recurring transfers

### 4. Create Your First Budget Period

1. Go to Budget Periods → Create New
2. Name it (e.g., "Paycheck December 15, 2024")
3. Set start and end dates
4. Manually copy items from your templates (or wait for automation)
5. Adjust amounts as needed
6. Add any one-time items

### 5. Manage Your Budget

For each budget period:
- Mark income as "received" when it arrives
- Mark expenses as "paid" when you pay them
- Mark transfers as "completed" when done
- Update actual amounts if different from planned
- Track your progress!

## Future Development Ideas

### Backend Features to Add

1. **Auto-populate Budget Periods**
   - Create a Payload hook to automatically copy template items when creating a new budget period
   - Location: `src/collections/BudgetPeriods.ts` → add `beforeChange` hook

2. **Auto-calculate Summaries**
   - Add a hook to calculate total income, expenses, and net income
   - Update account balances when transactions are completed

3. **Custom Endpoints**
   - `/api/budget-periods/create-from-templates` - Create new period from active templates
   - `/api/budget-periods/:id/copy` - Copy existing period to new dates
   - `/api/reports/budget-vs-actual` - Generate budget comparison reports
   - `/api/accounts/:id/balance-history` - Track balance changes over time

4. **Validation Rules**
   - Ensure transfer "from" and "to" accounts are different
   - Validate date ranges for budget periods
   - Check that scheduled items match their template schedules

5. **Advanced Features**
   - Recurring expense balance tracking (credit cards, loans)
   - Interest calculations
   - Budget rollover (unused budget carries to next period)
   - Forecasting (predict future balances based on templates)

### Frontend Features to Consider

When you build the frontend:
1. Dashboard showing current budget period status
2. Calendar view of upcoming expenses/income
3. Charts: budget vs actual, spending by category
4. Quick-add transaction from mobile
5. Duplicate budget period feature
6. Template management interface
7. Reports and analytics

## Data Model Notes

### Key Relationships

```
Templates → Budget Period Items
  ├─ Income Template → Budget Period Income[]
  ├─ Expense Template → Budget Period Expenses[]
  └─ Transfer Template → Budget Period Transfers[]

Shared Data (referenced):
  ├─ Schedules
  ├─ Categories (Income/Expense)
  ├─ Payees
  └─ Accounts
```

### MongoDB Advantages

- Budget periods are self-contained documents
- No joins needed to view a complete budget
- Historical data preserved when templates change
- Fast queries for date ranges

### When to Use PostgreSQL Instead

Consider switching to PostgreSQL if you need:
- Complex financial reporting with lots of joins
- Strong ACID guarantees for transactions
- Complex triggers and stored procedures
- Advanced query optimization

Currently, MongoDB should work well for this use case!

## Helpful Commands

```bash
# Start dev server
pnpm dev

# Generate TypeScript types
pnpm payload generate:types

# Build for production
pnpm build

# Run migrations (if needed)
pnpm payload migrate
```

## Questions to Consider

1. **How often do you get paid?**
   - This determines your budget period frequency

2. **Do you want to track actual transactions separately?**
   - The Transactions collection is optional if you just mark items in budget periods

3. **How do you handle variable expenses?**
   - Templates can have estimated amounts, actual amounts entered in each period

4. **Do you need to track multiple users?**
   - Current setup assumes single household, but can be extended

5. **What reports do you need?**
   - Spending by category over time?
   - Budget vs actual comparison?
   - Account balance trends?
   - Cash flow projections?

## Need Help?

Refer to:
- `BUDGET_MODEL.md` - Detailed data model documentation
- `src/seed-data.ts` - Initial data to add
- Payload CMS docs: https://payloadcms.com/docs
