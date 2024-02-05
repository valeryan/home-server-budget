using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace BudgetApi.Context
{
    public class MysqlDbContextFactory : IDesignTimeDbContextFactory<MySqlDbContext>
    {
        public MySqlDbContext CreateDbContext(string[] args)
        {
            string? connectionString = Environment.GetEnvironmentVariable("CONNECTION_STRING_DT");
            var serverVersion = new MySqlServerVersion(new Version(8, 0, 23));
            var optionsBuilder = new DbContextOptionsBuilder<MySqlDbContext>();
            optionsBuilder.UseMySql(connectionString, serverVersion);

            return new MySqlDbContext(optionsBuilder.Options);
        }
    }
}
