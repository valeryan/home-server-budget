using BudgetApp.Domain.Entities;

namespace BudgetApp.Domain.Contracts.Persistence
{
    public interface IExpenseCategoryRepository : IAsyncRepository<ExpenseCategory>
    {

    }
}