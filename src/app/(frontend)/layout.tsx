import { getPayloadClient } from '@/payload/client'
import { IBM_Plex_Sans, Space_Grotesk } from 'next/font/google'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import React from 'react'
import './styles.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  description: 'Household budgeting dashboard powered by Payload and Next.js.',
  title: 'Household Budget',
}

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
})

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '700'],
})

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  const headers = await getHeaders()
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect('/admin/login')
  }

  // If wizard not complete and no accounts exist, send to admin to finish setup
  const [settings, accounts] = await Promise.all([
    payload.find({ collection: 'app-settings', limit: 1 }),
    payload.find({ collection: 'accounts', limit: 1 }),
  ])
  const wizardComplete = Boolean(settings.docs[0]?.wizardComplete)
  const hasAccounts = accounts.totalDocs > 0

  if (!wizardComplete && !hasAccounts) {
    redirect('/admin')
  }

  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} frontendBody`}>
        <main>{children}</main>
      </body>
    </html>
  )
}
