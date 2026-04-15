/**
 * Budget Period Hooks
 *
 * Hooks for managing budget periods:
 * - Ensure only one period is "active" per account at a time
 */

import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Ensure only one budget period is "active" per account at a time
 */
export const enforceOneActiveBudgetPerAccount: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  // If this budget is being set to active, deactivate all others for this account
  if (data.status === 'active' && data.account) {
    const accountId = typeof data.account === 'object' ? data.account.id : data.account

    try {
      const activeBudgets = await req.payload.find({
        collection: 'budgets',
        where: {
          and: [
            {
              status: {
                equals: 'active',
              },
            },
            {
              account: {
                equals: accountId,
              },
            },
          ],
        },
        limit: 100,
      })

      // Update all currently active budgets to planning status
      for (const budget of activeBudgets.docs) {
        if (operation === 'update' && originalDoc && budget.id === originalDoc.id) continue // Skip self

        await req.payload.update({
          collection: 'budgets',
          id: budget.id,
          data: {
            status: 'planning',
          },
        })
      }

      if (activeBudgets.docs.length > 0) {
        req.payload.logger.info(
          `Set budget period "${data.name}" as active for account ${accountId}, deactivated ${activeBudgets.docs.length} other budget(s)`,
        )
      }
    } catch (error) {
      req.payload.logger.error({
        msg: 'Error managing active budget period',
        err: error,
      })
    }
  }

  return data
}
