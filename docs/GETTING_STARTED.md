# Getting Started

This guide covers the first setup steps after the app is running on your home server.

The normal access pattern is through your reverse proxy at:

`https://${HOST}`

This deployment expects the proxy layer to come from:

- https://github.com/valeryan/home-server

## 1. Open the Admin

Go to:

`https://${HOST}/admin`

Create your first admin user if you have not already done that.

## 2. Complete the Setup Wizard

The admin dashboard opens into a setup wizard until setup is marked complete.

Work through these sections:

1. Categories
2. Payees
3. Accounts
4. Recurring Items

The app seeds income and expense categories automatically, so this step is mostly for review and customization.

## 3. Add Accounts

Create the accounts you want to budget against, such as:

- checking
- savings
- credit cards

Make sure each account has a realistic starting balance.

## 4. Add Recurring Items

Recurring items are the planning templates for your budget. Each one is an `income`, `expense`, or `transfer`.

Typical examples:

- paycheck
- rent or mortgage
- utilities
- subscriptions
- savings transfer
- debt payment

Each recurring item can include:

- amount
- schedule
- category
- payee
- source or destination account

## 5. Create Budgets

After setup is complete, use the admin dashboard to create budget periods for an account.

A budget defines:

- name
- account
- start date
- end date
- status

Budget items link recurring items into a specific budget period.

## 6. Record Transactions

Transactions are the actual ledger records. They update account balances and can be matched to recurring items.

You can:

- add transactions manually
- create transactions from budget-related workflows
- sync supported accounts through Teller if that integration is configured

## 7. Optional: Enable Integrations

### Teller

To use Teller account linking and sync:

- set `NEXT_PUBLIC_TELLER_APP_ID`
- optionally set `NEXT_PUBLIC_TELLER_ENV`
- add Teller client certificates in `certs/`

### Ollama

To use AI transaction insights:

- make sure Ollama is reachable
- set `OLLAMA_URL` if you are not using the default
- set `OLLAMA_MODEL` if you want a specific model

## Helpful Commands

```bash
npm install
docker compose up -d
docker compose logs -f
npm run lint
npm test
```
