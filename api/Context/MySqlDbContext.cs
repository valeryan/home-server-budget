using Microsoft.EntityFrameworkCore;

namespace BudgetApi.Context
{
    public class MySqlDbContext : DbContext
    {
        public MySqlDbContext(DbContextOptions<MySqlDbContext> options)
            : base(options) { }

        // Define your entities as DbSet properties
        // public DbSet<Expense> Expenses { get; set; }
    }
}
