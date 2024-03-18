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

        public async Task DeleteAsync(User entity)
        {
            _dbContext.Users.Remove(entity);
            await _dbContext.SaveChangesAsync();
        }

        public async Task<bool> ExistsAsync(string username)
        {
            return await _dbContext.Users.AnyAsync(user => user.Username == username);
        }

        public async Task<User?> GetByIdAsync(int id)
        {
            return await _dbContext.Users
                .FirstOrDefaultAsync(user => user.Id == id);
        }

        public async Task<User?> GetByUsernameAsync(string username)
        {
            return await _dbContext.Users
                .FirstOrDefaultAsync(user => user.Username == username);
        }

        public async Task<IReadOnlyList<User>> ListAllAsync()
        {
            return await _dbContext.Users.ToListAsync();
        }

        public async Task UpdateAsync(User entity)
        {
            _dbContext.Users.Update(entity);
            await _dbContext.SaveChangesAsync();
        }
    }
}
