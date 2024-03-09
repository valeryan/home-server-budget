using BudgetApp.Domain.Entities;

namespace BudgetApp.Domain.Contracts.Persistence
{
    public interface ITransactionRepository : IAsyncRepository<Transaction>
    {

    }
}
