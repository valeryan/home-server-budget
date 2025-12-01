// storage-adapter-import-placeholder
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Accounts } from './collections/Accounts'
import { BudgetItems } from './collections/BudgetItems'
import { Budgets } from './collections/BudgetPeriods'
import { BudgetSchedules } from './collections/BudgetSchedules'
import { ExpenseCategories } from './collections/ExpenseCategories'
import { IncomeCategories } from './collections/IncomeCategories'
import { Media } from './collections/Media'
import { Payees } from './collections/Payees'
import { RecurringItems } from './collections/RecurringItems'
import { Transactions } from './collections/Transactions'
import { Users } from './collections/Users'
import { seed } from './seed'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      // Replace default dashboard
      views: {
        dashboard: {
          Component: '@/components/Dashboard#default',
        },
      },
      beforeNavLinks: ['/components/DashboardNavLink#DashboardNavLink'],
    },
  },
  collections: [
    Users,
    Media,
    IncomeCategories,
    ExpenseCategories,
    Payees,
    Accounts,
    Transactions,
    RecurringItems,
    Budgets,
    BudgetItems,
    BudgetSchedules,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  sharp,
  plugins: [
    // storage-adapter-placeholder
  ],
  onInit: async (payload) => {
    // Seed the database with initial data
    await seed(payload)
  },
})
