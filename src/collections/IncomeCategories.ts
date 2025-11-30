import type { CollectionConfig } from 'payload'

export const IncomeCategories: CollectionConfig = {
  slug: 'income-categories',
  admin: {
    useAsTitle: 'name',
    description: '✅ Auto-seeded • Income categories (edit or add more as needed)',
    group: '⚙️ System',
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
