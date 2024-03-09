using BudgetApp.Domain.Contracts.Persistence;
using BudgetApp.Domain.Entities;
using BudgetApp.Infrastructure.Context;
using Microsoft.EntityFrameworkCore;

namespace BudgetApp.Infrastructure.Persistence
{
    public class AccountRepository(MySqlDbContext mySqlDbContext) : IAccountRepository
    {
        private readonly MySqlDbContext _dbContext = mySqlDbContext;

        public Task<Account> AddAsync(Account entity)
        {
            throw new NotImplementedException();
        }

        public Task DeleteAsync(Account entity)
        {
            throw new NotImplementedException();
        }

        public Task<Account> GetByIdAsync(int id)
        {
            throw new NotImplementedException();
        }

        public async Task<IReadOnlyList<Account>> ListAllAsync()
        {
            return await _dbContext.Accounts.ToListAsync();
        }

        public Task UpdateAsync(Account entity)
        {
            throw new NotImplementedException();
        }
    }
}
