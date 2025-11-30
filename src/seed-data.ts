/**
 * Example Data for Budget Application
 *
 * This file contains example data that you can use as reference when adding
 * your personal accounts and payees.
 *
 * NOTE: Schedules and categories are automatically seeded when the app first runs.
 * You don't need to manually add those - just add your accounts and payees!
 */

/**
 * SCHEDULES AND CATEGORIES ARE AUTO-SEEDED
 *
 * The following are automatically created when you first start the app:
 * - Schedules: Weekly, Bi-weekly, Monthly, Bi-monthly, Quarterly, Semi-annually, Annually
 * - Income Categories: Regular Pay, Bonus, Investment Income, Rental Income, Other Income
 * - Expense Categories: Food, Utilities, Housing, Transportation, Entertainment, Healthcare,
 *   Personal Care, Education, Debt, Insurance, Savings, Other
 *
 * You can edit or add more through the admin UI after the app starts.
 */

/**
 * Example Payees - Customize these for your needs
 * Add these manually through the Payload admin UI at /admin/collections/payees
 */
export const examplePayees = [
  {
    name: 'My Employer',
    description: 'Primary employer',
  },
  {
    name: 'Landlord/Mortgage Company',
    description: 'Housing payment',
  },
  {
    name: 'Electric Company',
    description: 'Electricity provider',
  },
  {
    name: 'Water Company',
    description: 'Water utility',
  },
  {
    name: 'Gas Company',
    description: 'Gas utility',
  },
  {
    name: 'Internet Provider',
    description: 'Internet service',
  },
  {
    name: 'Cell Phone Provider',
    description: 'Mobile service',
  },
  {
    name: 'Grocery Store',
    description: 'Primary grocery shopping',
  },
]

/**
 * Example Accounts - Customize these for your needs
 * Add these manually through the Payload admin UI at /admin/collections/accounts
 */
export const exampleAccounts = [
  {
    name: 'Main Checking',
    description: 'Primary checking account',
    accountType: 'checking',
    startingBalance: 0,
    currentBalance: 0,
  },
  {
    name: 'Savings',
    description: 'Emergency fund and savings',
    accountType: 'savings',
    startingBalance: 0,
    currentBalance: 0,
    interestRate: {
      enabled: true,
      rate: 4.5, // 4.5% APY
      schedule: null, // Set to monthly schedule ID
    },
  },
  {
    name: 'Credit Card',
    description: 'Primary credit card',
    accountType: 'credit_card',
    startingBalance: 0,
    currentBalance: 0,
    interestRate: {
      enabled: true,
      rate: 18.99, // 18.99% APR
      schedule: null, // Set to monthly schedule ID
    },
  },
]
