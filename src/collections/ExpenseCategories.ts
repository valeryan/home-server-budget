import type { CollectionConfig } from 'payload'

export const ExpenseCategories: CollectionConfig = {
  slug: 'expense-categories',
  admin: {
    useAsTitle: 'name',
    description: '✅ Auto-seeded • Expense categories (edit or add more as needed)',
    group: '⚙️ Setup',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
  ],
}
