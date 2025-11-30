# Home Budget Management System

A Payload CMS-based budget management application designed to replace spreadsheet-based budgeting with a proper backend system.

## Overview

This application helps you manage your home budget by creating budget periods that align with your paycheck schedule. It features:

- **Template-based budgeting**: Define recurring income, expenses, and transfers once
- **Period-based tracking**: Create a new budget for each paycheck cycle
- **Multiple accounts**: Track checking, savings, credit cards, etc.
- **Planned vs Actual**: Compare budgeted amounts with actual spending
- **MongoDB-optimized**: Document-oriented design for efficient queries

## Documentation

- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Quick start guide and next steps
- **[BUDGET_MODEL.md](./BUDGET_MODEL.md)** - Detailed data model documentation
- **[src/seed-data.ts](./src/seed-data.ts)** - Initial data to populate your system
- **[src/hooks/budgetPeriodHooks.example.ts](./src/hooks/budgetPeriodHooks.example.ts)** - Example automation hooks

## Collections Overview

The application includes the following collections:

### Configuration Collections
- **Schedules**: Recurring schedule types (weekly, bi-weekly, monthly, etc.)
- **Income Categories**: Categories for income items (Regular Pay, Bonus, etc.)
- **Expense Categories**: Categories for expenses (Food, Utilities, Housing, etc.)
- **Payees**: People and companies you receive money from or pay to
- **Accounts**: Your financial accounts (checking, savings, credit cards, etc.)

### Template Collections
- **Income Templates**: Recurring income items (salary, side income, etc.)
- **Expense Templates**: Recurring expenses (rent, utilities, subscriptions, etc.)
- **Transfer Templates**: Recurring transfers between accounts

### Budget Management
- **Budget Periods**: Individual budget cycles (one per paycheck)
  - Embeds income, expense, and transfer items
  - Tracks planned vs actual amounts
  - Calculates summary totals
- **Transactions**: Optional historical record of all financial movements

## Quick Start - Local Setup

To spin up this template locally, follow these steps:

### Clone

After you click the `Deploy` button above, you'll want to have standalone copy of this repo on your machine. If you've already cloned this repo, skip to [Development](#development).

### Development

1. First clone the repo if you have not done so already
2. `cp .env.example .env` to copy the example environment variables
3. Add your MongoDB connection string to `MONGODB_URI` in `.env`
4. Add a secure secret to `PAYLOAD_SECRET` in `.env`
5. `pnpm install && pnpm dev` to install dependencies and start the dev server
6. Open `http://localhost:3000/admin` to access the admin panel
7. Create your first admin user
8. Follow the [GETTING_STARTED.md](./GETTING_STARTED.md) guide to set up your budget

That's it! Changes made in `./src` will be reflected in your app.

#### Docker (Optional)

If you prefer to use Docker for local development instead of a local MongoDB instance, the provided docker-compose.yml file can be used.

To do so, follow these steps:

- Modify the `MONGODB_URI` in your `.env` file to `mongodb://127.0.0.1/<dbname>`
- Modify the `docker-compose.yml` file's `MONGODB_URI` to match the above `<dbname>`
- Run `docker-compose up` to start the database, optionally pass `-d` to run in the background.

## How It Works

This budget system is designed around a template-based workflow:

1. **Set up your configuration**: Add schedules, categories, payees, and accounts
2. **Create templates**: Define your recurring income, expenses, and transfers
3. **Create budget periods**: For each paycheck, create a new budget period
4. **Track actuals**: Mark items as received/paid and update actual amounts
5. **Monitor progress**: View summaries and track budget vs actual spending

### Key Design Principles

- **Document-oriented**: Budget periods are self-contained MongoDB documents
- **Template-based**: Recurring items are defined once and copied to each period
- **Flexible**: Easy to add one-time items or adjust amounts per period
- **Historical**: Past budget periods preserve data even if templates change

### Collections

### Authentication & Media

See the [Collections](https://payloadcms.com/docs/configuration/collections) docs for details on how to extend this functionality.

- **Users**: Auth-enabled collection with access to the admin panel
- **Media**: Upload-enabled collection for file storage

For additional help, see the official [Auth Example](https://github.com/payloadcms/payload/tree/main/examples/auth) or the [Authentication](https://payloadcms.com/docs/authentication/overview#authentication-overview) docs.

## Next Steps

After getting the app running:

1. **Populate initial data** - Add schedules, categories, payees, and accounts (see [GETTING_STARTED.md](./GETTING_STARTED.md))
2. **Create templates** - Define your recurring budget items
3. **Build your first budget** - Create a budget period for your next paycheck
4. **Add automation** - Implement hooks to auto-populate periods (see `src/hooks/budgetPeriodHooks.example.ts`)
5. **Build a frontend** - Create a user-friendly interface for your wife to manage the budget

## Future Enhancements

- Auto-populate budget periods from templates
- Auto-calculate summary totals
- Account balance tracking with transaction hooks
- Custom API endpoints for reporting
- Budget vs actual comparison reports
- Account balance history and forecasting
- Mobile-friendly frontend

### Docker

Alternatively, you can use [Docker](https://www.docker.com) to spin up this template locally. To do so, follow these steps:

1. Follow [steps 1 and 2 from above](#development), the docker-compose file will automatically use the `.env` file in your project root
1. Next run `docker-compose up`
1. Follow [steps 4 and 5 from above](#development) to login and create your first admin user

That's it! The Docker instance will help you get up and running quickly while also standardizing the development environment across your teams.

## Questions

If you have any issues or questions, reach out to us on [Discord](https://discord.com/invite/payload) or start a [GitHub discussion](https://github.com/payloadcms/payload/discussions).
