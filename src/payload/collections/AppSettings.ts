import type { CollectionConfig } from 'payload'

export const AppSettings: CollectionConfig = {
  slug: 'app-settings',
  admin: {
    useAsTitle: 'id',
    group: '⚙️ System',
    hidden: true,
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'wizardComplete',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Marks whether the initial setup wizard has been completed.',
      },
    },
  ],
}
