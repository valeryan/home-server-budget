// storage-adapter-import-placeholder
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Accounts } from './collections/Accounts'
import { Budgets } from './collections/BudgetPeriods'
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
      // Add custom dashboard component
      afterDashboard: ['@/components/Dashboard#default'],
    },
  },
  collections: [
    Users,
    Media,
    // Setup - Do these first (in order)
    IncomeCategories,
    ExpenseCategories,
    Payees,
    Accounts,
    // Recurring Items - Define recurring income/expenses/transfers
    RecurringItems,
    // Budgets - Create budgets for each paycheck
    Budgets,
    Transactions,
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
