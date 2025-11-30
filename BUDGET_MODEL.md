# Budget Management System - Data Model Documentation

## Overview

This Payload CMS application manages your home budget with a MongoDB-friendly schema that supports recurring income and expenses, multiple accounts, and budget periods tied to your paycheck schedule.

## Key Concepts

### 1. **Templates** (The Blueprint)
Templates define your recurring financial items - things that happen regularly:
- **Income Templates**: Your salary, freelance income, etc.
- **Expense Templates**: Rent, utilities, subscriptions, etc.
- **Transfer Templates**: Regular savings transfers, account movements, etc.

Each template includes:
- Name, amount, category, payee
- Schedule (how often it occurs)
- Account (where money comes from/goes to)
- Active/inactive status

### 2. **Budget Periods** (The Actual Budget)
A budget period represents one budgeting cycle (typically aligned with when you get paid). Each period:
- Has a date range (start/end)
- Contains actual income, expense, and transfer items
- Items can be created from templates OR added manually
- Each item tracks both planned and actual amounts
- Items have status flags (received, paid, completed)

**Workflow**: When you get a paycheck, you create a new budget period, copy items from your active templates, and then manage that specific period.

### 3. **Accounts**
Your financial accounts (checking, savings, credit cards, etc.):
- Tracks starting and current balance
- Can have interest rates
- All transactions reference accounts

### 4. **Transactions** (Optional Historical Record)
A separate historical log of all financial movements for reporting and reconciliation.

## Data Model Design Decisions

### MongoDB-Friendly Approach

Unlike your original relational schema, this design leverages MongoDB's strengths:

1. **Embedded Arrays**: Budget periods embed their income/expense/transfer items as arrays instead of separate tables. This is efficient because:
   - You typically work with one budget period at a time
   - All the data you need is in one document
   - No joins needed for common queries

2. **References for Shared Data**: Categories, payees, schedules, and accounts are separate collections because:
   - They're shared across many items
   - They're relatively stable (don't change often)
   - You want to manage them centrally

3. **Denormalization**: Budget period items include a reference to their template but also store all the data directly. This means:
   - You can change templates without affecting existing budgets
   - Historical data is preserved
   - Each budget period is independent

### Comparison to Your .NET Schema

**Old Relational Approach**:
```
Budget → BudgetPeriods → Transactions (Income/Expense referenced separately)
```

**New MongoDB Approach**:
```
Templates (define recurring items)
    ↓
BudgetPeriods (embed actual items for this period)
    ↓
Transactions (optional historical record)
```

**Key Differences**:
- **Templates separate from periods**: Your old schema had Income/Expense entities that seemed to serve as both templates and actuals
- **Embedded items**: Instead of separate Income/Expense tables with foreign keys, budget periods contain arrays
- **Simplified schedules**: Removed complex ScheduleParams JSON in favor of just referencing schedule types
- **No ApplicationData inheritance**: Created separate, focused collections instead of table-per-hierarchy

## Collection Reference

### Configuration Collections (Set these up first)

#### Schedules
Predefined schedule types for recurring items.
```typescript
{
  name: "Bi-weekly",
  description: "Occurs every two weeks",
  type: "biweekly"
}
```

#### IncomeCategories / ExpenseCategories
Categories to organize income and expenses.
```typescript
{
  name: "Regular Pay",
  description: "Regular income from employment"
}
```

#### Payees
People or companies you receive money from or pay money to.
```typescript
{
  name: "ACME Corporation",
  description: "My employer"
}
```

#### Accounts
Your financial accounts.
```typescript
{
  name: "Main Checking",
  accountType: "checking",
  startingBalance: 1000.00,
  currentBalance: 1250.00,
  interestRate: {
    enabled: false
  }
}
```

### Template Collections (Define your recurring budget items)

#### IncomeTemplates
```typescript
{
  name: "Biweekly Salary",
  amount: 2500.00,
  category: "regular-pay-id",
  payee: "employer-id",
  schedule: "biweekly-schedule-id",
  account: "checking-account-id",
  isActive: true
}
```

#### ExpenseTemplates
```typescript
{
  name: "Rent",
  amount: 1200.00,
  category: "housing-id",
  payee: "landlord-id",
  schedule: "monthly-schedule-id",
  account: "checking-account-id",
  hasBalance: false,
  isActive: true
}
```

#### TransferTemplates
```typescript
{
  name: "Emergency Fund Contribution",
  amount: 200.00,
  fromAccount: "checking-id",
  toAccount: "savings-id",
  schedule: "biweekly-schedule-id",
  isActive: true
}
```

### Budget Period Collection (Your actual budgets)

#### BudgetPeriods
```typescript
{
  name: "Paycheck December 15, 2024",
  startDate: "2024-12-15",
  endDate: "2024-12-28",
  status: "active",
  income: [
    {
      template: "salary-template-id", // Optional reference
      name: "Biweekly Salary",
      amount: 2500.00,
      actualAmount: 2480.00, // What you actually got
      category: "regular-pay-id",
      payee: "employer-id",
      account: "checking-id",
      date: "2024-12-15T12:00:00Z",
      received: true
    }
  ],
  expenses: [
    {
      template: "rent-template-id",
      name: "Rent",
      amount: 1200.00,
      actualAmount: null, // Not paid yet
      category: "housing-id",
      payee: "landlord-id",
      account: "checking-id",
      dueDate: "2024-12-01",
      paid: false
    }
  ],
  transfers: [
    {
      template: "emergency-fund-template-id",
      name: "Emergency Fund",
      amount: 200.00,
      fromAccount: "checking-id",
      toAccount: "savings-id",
      date: "2024-12-15T12:00:00Z",
      completed: true
    }
  ],
  summary: {
    totalIncome: 2500.00,
    totalExpenses: 1200.00,
    netIncome: 1300.00
  }
}
```

### Transactions Collection (Historical record)

```typescript
{
  date: "2024-12-15T12:00:00Z",
  type: "income",
  description: "Biweekly Salary",
  amount: 2480.00,
  budgetPeriod: "period-id",
  incomeDetails: {
    category: "regular-pay-id",
    payee: "employer-id",
    account: "checking-id"
  },
  reconciled: true
}
```

## Usage Workflow

### Setup Phase (One-time)
1. Create **Schedules** (or use defaults)
2. Create **Income Categories** and **Expense Categories**
3. Create **Payees** for all the people/companies you deal with
4. Create **Accounts** for your bank accounts, credit cards, etc.
5. Create **Templates** for all your recurring income, expenses, and transfers

### Regular Use (Each Paycheck)
1. Create a new **Budget Period** with appropriate dates
2. Copy items from your active templates (this could be automated with a hook)
3. Adjust amounts as needed for this specific period
4. Add any one-time income or expenses
5. Track items as they happen (mark as received/paid/completed)
6. Optionally create **Transaction** records for reconciliation

### Future Enhancements
- **Hooks**: Auto-populate budget periods from templates
- **Custom endpoints**: Create endpoints to "copy templates to new period"
- **Calculations**: Auto-calculate summary totals on save
- **Reporting**: Custom endpoints for budget vs actual reports
- **Balance tracking**: Hooks to update account balances when transactions are marked complete

## Why This Works for MongoDB

1. **Document-oriented**: Each budget period is self-contained
2. **No complex joins**: Related data is embedded where it's used together
3. **Flexible schema**: Easy to add fields without migrations
4. **Natural querying**: `db.budgetPeriods.find({ startDate: { $gte: "2024-01-01" } })` gets everything you need
5. **Atomic operations**: Update entire budget period in one operation

## Migration Notes from .NET Schema

If you're migrating data:
- Your old `Schedule` table → `Schedules` collection
- Your old `IncomeCategory`/`ExpenseCategory` → separate collections
- Your old `Income`/`Expense` tables → split into Templates and embedded items in BudgetPeriods
- Your old `Transaction` table → `Transactions` collection (structure changed)
- Your old `Budget` and `BudgetPeriod` → combined into `BudgetPeriods`

The main conceptual shift: Instead of having persistent Income/Expense entities that link to budget periods, you have templates that stamp out copies into each period.
