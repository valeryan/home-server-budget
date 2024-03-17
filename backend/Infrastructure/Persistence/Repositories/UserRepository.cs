using BudgetApp.Domain.Contracts.Persistence.Repositories;
using BudgetApp.Domain.Entities;
using BudgetApp.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace BudgetApp.Infrastructure.Persistence.Repositories
{
    public class UserRepository(MySqlDbContext mySqlDbContext) : IUserRepository
    {
        private readonly MySqlDbContext _dbContext = mySqlDbContext;

        public async Task<User> AddAsync(User entity)
        {
            await _dbContext.Users.AddAsync(entity);
            await _dbContext.SaveChangesAsync();
            return entity;
        }

        public Task DeleteAsync(User entity)
        {
            throw new NotImplementedException();
        }

        public async Task<bool> ExistsAsync(string username)
        {
            return await _dbContext.Users.AnyAsync(user => user.Username == username);
        }

        public Task<User?> GetByIdAsync(int id)
        {
            throw new NotImplementedException();
        }

        public Task<IReadOnlyList<User>> ListAllAsync()
        {
            throw new NotImplementedException();
        }

        public Task UpdateAsync(User entity)
        {
            throw new NotImplementedException();
        }
    }
}
