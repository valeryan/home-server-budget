// storage-adapter-import-placeholder
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { seed } from '@/payload/seed'
import { Accounts } from '@/payload/collections/Accounts'
import { AppSettings } from '@/payload/collections/AppSettings'
import { BudgetItems } from '@/payload/collections/BudgetItems'
import { Budgets } from '@/payload/collections/BudgetPeriods'
import { BudgetSchedules } from '@/payload/collections/BudgetSchedules'
import { ExpenseCategories } from '@/payload/collections/ExpenseCategories'
import { IncomeCategories } from '@/payload/collections/IncomeCategories'
import { MatchRules } from '@/payload/collections/MatchRules'
import { Media } from '@/payload/collections/Media'
import { Payees } from '@/payload/collections/Payees'
import { RecurringItems } from '@/payload/collections/RecurringItems'
import { TellerInsights } from '@/payload/collections/TellerInsights'
import { Transactions } from '@/payload/collections/Transactions'
import { Users } from '@/payload/collections/Users'

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
          Component: '@/payload/admin/dashboard/Dashboard#default',
        },
      },
      beforeNavLinks: ['@/payload/admin/nav/DashboardNavLink#DashboardNavLink'],
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
    MatchRules,
    AppSettings,
    TellerInsights,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, '../payload-types.ts'),
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
