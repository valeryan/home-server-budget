import type { Payload } from 'payload'

export const seed = async (payload: Payload): Promise<void> => {
  payload.logger.info('Starting database seed...')

  try {
    // Seed Income Categories
    const existingIncomeCategories = await payload.find({
      collection: 'income-categories',
      limit: 1,
    })

    if (existingIncomeCategories.totalDocs === 0) {
      payload.logger.info('Seeding income categories...')
      const incomeCategories = [
        {
          name: 'Regular Pay',
          description: 'Regular income from employment',
        },
        {
          name: 'Bonus',
          description: 'Additional income received as a bonus',
        },
        {
          name: 'Investment Income',
          description: 'Income generated from investments',
        },
        {
          name: 'Rental Income',
          description: 'Income from renting out property or assets',
        },
        {
          name: 'Other Income',
          description: 'Miscellaneous income',
        },
      ]

      for (const category of incomeCategories) {
        await payload.create({
          collection: 'income-categories',
          data: category,
        })
      }
      payload.logger.info(`✓ Created ${incomeCategories.length} income categories`)
    } else {
      payload.logger.info('Income categories already exist, skipping...')
    }

    // Seed Expense Categories
    const existingExpenseCategories = await payload.find({
      collection: 'expense-categories',
      limit: 1,
    })

    if (existingExpenseCategories.totalDocs === 0) {
      payload.logger.info('Seeding expense categories...')
      const expenseCategories = [
        {
          name: 'Food',
          description: 'Expenses related to groceries and dining out',
        },
        {
          name: 'Utilities',
          description: 'Expenses related to electricity, water, gas, etc.',
        },
        {
          name: 'Housing',
          description: 'Expenses related to rent, mortgage, or property taxes',
        },
        {
          name: 'Transportation',
          description:
            'Expenses related to transportation, such as fuel, public transit, or vehicle maintenance',
        },
        {
          name: 'Entertainment',
          description:
            'Expenses related to leisure activities, such as movies, concerts, or streaming services',
        },
        {
          name: 'Healthcare',
          description: 'Expenses related to medical care, prescriptions, or health insurance',
        },
        {
          name: 'Personal Care',
          description:
            'Expenses related to personal grooming, such as haircuts or skincare products',
        },
        {
          name: 'Education',
          description: 'Expenses related to tuition, books, or educational materials',
        },
        {
          name: 'Debt',
          description:
            'Expenses related to debt repayment, such as credit card bills or loan payments',
        },
        {
          name: 'Insurance',
          description: 'Insurance premiums (auto, home, life, etc.)',
        },
        {
          name: 'Savings',
          description: 'Contributions to savings accounts or emergency fund',
        },
        {
          name: 'Other',
          description: 'Miscellaneous expenses',
        },
      ]

      for (const category of expenseCategories) {
        await payload.create({
          collection: 'expense-categories',
          data: category,
        })
      }
      payload.logger.info(`✓ Created ${expenseCategories.length} expense categories`)
    } else {
      payload.logger.info('Expense categories already exist, skipping...')
    }

    payload.logger.info('✅ Database seed completed successfully!')
  } catch (error) {
    payload.logger.error('Error seeding database:')
    payload.logger.error(error)
    throw error
  }
}
