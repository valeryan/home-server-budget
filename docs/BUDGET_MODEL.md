# Budget Model

This document describes the main collections and how they relate to each other in the current app.

## Core Collections

### Accounts

Financial accounts that hold balances, such as checking, savings, and credit cards.

Important fields include:

- `name`
- `accountType`
- `startingBalance`
- `currentBalance`
- optional Teller connection fields

### Income Categories and Expense Categories

Reference collections used to classify recurring items and transactions.

These are seeded automatically on startup if the collections are empty.

### Payees

Named people or businesses tied to income and expense activity.

### Recurring Items

Recurring items are the planning templates used throughout the app.

Each recurring item has an `itemType` of:

- `income`
- `expense`
- `transfer`

Depending on type, a recurring item can reference:

- income or expense category
- payee
- account
- from-account and to-account for transfers
- schedule details

### Budgets

Budgets define a date-bounded planning period for a specific account.

Important fields include:

- `name`
- `account`
- `startDate`
- `endDate`
- `status`

### Budget Items

Budget items connect a recurring item to a specific budget period.

They track whether a planned item has been actualized and can optionally point to the transaction that fulfilled it.

### Transactions

Transactions are the ledger records for actual money movement.

Each transaction has a `type` of:

- `income`
- `expense`
- `transfer`

Transactions drive account balance updates and can store:

- category
- payee
- matched recurring item
- Teller metadata for synced records

### Match Rules

Rules used to auto-apply categorization and recurring-item matches to transactions with similar descriptions.

### Teller Insights

Cached AI-assisted transaction suggestions used when Teller-synced transactions need payee, category, or recurring-item suggestions.

## Relationship Summary

- accounts own balances
- recurring items describe planned activity
- budgets group a planning period for one account
- budget items attach recurring items to a budget
- transactions represent actual activity
- match rules and teller insights help classify transactions

## Setup Flow

The current app flow is:

1. Review seeded categories
2. Add payees
3. Add accounts
4. Add recurring items
5. Create budgets
6. Record or sync transactions

## Notes

- The app uses a unified `recurring-items` collection rather than separate income and expense template collections.
- Categories are seeded automatically.
- Teller sync and Ollama insights are optional integrations layered on top of the core budgeting workflow.
