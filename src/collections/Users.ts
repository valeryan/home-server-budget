import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: '⚙️ System',
  },
  auth: true,
  fields: [
    // Email added by default
    {
      name: 'defaultAccount',
      type: 'relationship',
      relationTo: 'accounts',
      admin: {
        description: 'The default account to show on your dashboard',
      },
    },
  ],
}
