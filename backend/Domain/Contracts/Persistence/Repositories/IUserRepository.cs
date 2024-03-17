using BudgetApp.Domain.Entities;

namespace BudgetApp.Domain.Contracts.Persistence.Repositories
{
    public interface IUserRepository : IAsyncRepository<User>
    {
        Task<bool> ExistsAsync(string username);
    }
}
