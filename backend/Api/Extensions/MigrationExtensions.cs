using BudgetApp.Infrastructure.Context;
using Microsoft.EntityFrameworkCore;

namespace BudgetApp.API.Extensions;

public static class MigrationExtensions
{
    public static void ApplyMigrations(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();

        var dbContext = scope.ServiceProvider.GetRequiredService<MySqlDbContext>();

        dbContext.Database.Migrate();
    }
}
