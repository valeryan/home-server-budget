using BudgetApp.Domain.Entities;

namespace BudgetApp.Domain.Contracts.Persistence
{
    public interface IExpenseRepository : IAsyncRepository<Expense>
    {

    }
}
