'use client'

import { Gutter } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'
import { BudgetDashboard } from '../BudgetDashboard'
import { WizardDashboard } from '../WizardDashboard'

interface SetupStatus {
  incomeCategories: number
  expenseCategories: number
  payees: number
  accounts: number
}

interface BudgetAutomation {
  id: string
  name: string
  account: {
    id: string
    name: string
    accountType: string
    currentBalance: number
  }
  scheduleType: string
  isActive: boolean
}

const Dashboard: React.FC = () => {
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [automations, setAutomations] = useState<BudgetAutomation[]>([])
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

        // Fetch budget automations if setup is complete
        if (statusObj.payees > 0 && statusObj.accounts > 0) {
          const automationsResponse = await fetch(
            '/api/budget-schedules?where[isActive][equals]=true&limit=100&depth=1',
          )
          const automationsData = await automationsResponse.json()
          setAutomations(automationsData.docs || [])
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
  return <BudgetDashboard automations={automations} />
}
export default Dashboard
