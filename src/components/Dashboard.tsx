'use client'

import { Gutter } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'
import { BudgetDashboard } from './BudgetDashboard'
import { WizardDashboard } from './WizardDashboard'

interface SetupStatus {
  incomeCategories: number
  expenseCategories: number
  payees: number
  accounts: number
}

interface Account {
  id: string
  name: string
  accountType: string
  currentBalance: number
}

const Dashboard: React.FC = () => {
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [userDefaultAccount, setUserDefaultAccount] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch setup status
        const collections = ['income-categories', 'expense-categories', 'payees', 'accounts']

        const results = await Promise.all(
          collections.map(async (collection) => {
            const response = await fetch(`/api/${collection}?limit=0`)
            const data = await response.json()
            return { collection, count: data.totalDocs || 0 }
          }),
        )

        const statusObj: SetupStatus = {
          incomeCategories: 0,
          expenseCategories: 0,
          payees: 0,
          accounts: 0,
        }
        results.forEach(({ collection, count }) => {
          const key = collection.replace(/-([a-z])/g, (g) =>
            g[1].toUpperCase(),
          ) as keyof SetupStatus
          statusObj[key] = count
        })

        setStatus(statusObj)

        // Fetch full account data if setup is complete
        if (statusObj.payees > 0 && statusObj.accounts > 0) {
          const accountsResponse = await fetch('/api/accounts?limit=100')
          const accountsData = await accountsResponse.json()
          setAccounts(accountsData.docs || [])

          // Fetch user's default account preference
          try {
            const meResponse = await fetch('/api/users/me')
            const userData = await meResponse.json()
            if (userData?.user?.defaultAccount) {
              // Handle both populated and unpopulated relationship
              const defaultAccountId =
                typeof userData.user.defaultAccount === 'string'
                  ? userData.user.defaultAccount
                  : userData.user.defaultAccount?.id
              setUserDefaultAccount(defaultAccountId)
            }
          } catch (error) {
            console.error('Error fetching user preferences:', error)
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <Gutter>
        <h2>Loading dashboard...</h2>
      </Gutter>
    )
  }

  if (!status) {
    return (
      <Gutter>
        <h2>Error loading dashboard</h2>
      </Gutter>
    )
  }

  // Determine if setup is complete
  const setupComplete = status.payees > 0 && status.accounts > 0

  // Show wizard if setup is not complete
  if (!setupComplete) {
    return <WizardDashboard status={status} />
  }

  // Show budget dashboard if setup is complete
  return <BudgetDashboard accounts={accounts} userDefaultAccount={userDefaultAccount} />
}

export default Dashboard
