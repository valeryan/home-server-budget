using BudgetApp.Domain.Entities;

namespace BudgetApp.Domain.Contracts.Persistence
{
    public interface IAccountRepository : IAsyncRepository<Account>
    {
        // Add additional methods here
    }
}
