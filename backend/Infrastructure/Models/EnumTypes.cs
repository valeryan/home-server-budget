namespace BudgetApp.Infrastructure.Models
{
    public enum ApplicationDataType
    {
        Schedule = 1,
        Payee = 2,
        IncomeCategory = 3,
        ExpenseCategory = 4
    }

    public enum TransactionType
    {
        Income = 1,
        Expense = 2
    }
}
