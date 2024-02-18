using BudgetApp.Infrastructure.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BudgetApp.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(this IServiceCollection services)
        {
            // Access the connection string from environment variables
            string? connectionString = Environment.GetEnvironmentVariable("CONNECTION_STRING");
            var serverVersion = new MySqlServerVersion(new Version(8, 0, 23));

            if (string.IsNullOrEmpty(connectionString))
            {
                // Log an error or throw an exception, depending on your application's requirements
                Console.Error.WriteLine("Error: Connection string is missing or empty.");
                // Alternatively, you can throw an exception to stop the application startup
                throw new InvalidOperationException("Connection string is missing or empty.");
            }
            services.AddDbContext<MySqlDbContext>(options =>
            {
                options.UseMySql(connectionString, serverVersion);
            });
            return services;
        }
    }
}
