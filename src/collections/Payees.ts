import type { CollectionConfig } from 'payload'

export const Payees: CollectionConfig = {
  slug: 'payees',
  admin: {
    useAsTitle: 'name',
    description: 'People and companies you transact with',
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
