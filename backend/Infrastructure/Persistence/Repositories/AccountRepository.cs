using BudgetApp.Domain.Contracts.Persistence.Repositories;
using BudgetApp.Domain.Entities;
using BudgetApp.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace BudgetApp.Infrastructure.Persistence.Repositories
{
    public class AccountRepository(MySqlDbContext mySqlDbContext) : IAsyncRepository<Account>
    {
        private readonly MySqlDbContext _dbContext = mySqlDbContext;

        public async Task<Account> AddAsync(Account entity)
        {
            await _dbContext.Accounts.AddAsync(entity);
            await _dbContext.SaveChangesAsync();
            return entity;
        }

        public Task DeleteAsync(Account entity)
        {
            throw new NotImplementedException();
        }

        public async Task<Account?> GetByIdAsync(int id)
        {
            return await _dbContext.Accounts
                .Include(account => account.Balance)
                .FirstOrDefaultAsync(account => account.Id == id);
        }

        public async Task<IReadOnlyList<Account>> ListAllAsync()
        {
            return await _dbContext.Accounts
                .Include(account => account.Balance)
                .ToListAsync();
        }

        public Task UpdateAsync(Account entity)
        {
            throw new NotImplementedException();
        }
    }
}
