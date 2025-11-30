import type { CollectionConfig } from 'payload'

export const Payees: CollectionConfig = {
  slug: 'payees',
  admin: {
    useAsTitle: 'name',
    description: '📋 Step 1: Add payees (employers, landlords, stores, etc.)',
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
