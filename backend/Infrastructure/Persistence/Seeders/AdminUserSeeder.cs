using BudgetApp.Domain.Contracts.Persistence.Repositories;
using BudgetApp.Domain.Contracts.Services;
using BudgetApp.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BudgetApp.Infrastructure.Persistence.Seeders;

public class AdminUserSeeder(
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<AdminUserSeeder> logger
) : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory = scopeFactory;
    private readonly IConfiguration _configuration = configuration;
    private readonly ILogger<AdminUserSeeder> _logger = logger;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
        var passwordService = scope.ServiceProvider.GetRequiredService<IPasswordService>();
        await CreateAdminUser(userRepository, passwordService, cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    private async Task CreateAdminUser(
        IUserRepository userRepository,
        IPasswordService passwordService,
        CancellationToken cancellationToken
    )
    {
        _logger.LogInformation("Checking admin user...");
        var adminUsername = _configuration["ADMIN_USER"];
        var adminPassword = _configuration["ADMIN_PASSWORD"];

        if (string.IsNullOrEmpty(adminUsername) || string.IsNullOrEmpty(adminPassword))
        {
            // We only attempt to seed the admin user if the environment variables are set
            _logger.LogInformation("Admin user or password not set, skipping admin user creation.");
            return;
        }

        if (!await userRepository.ExistsAsync(adminUsername))
        {
            var (passwordHash, salt) = passwordService.HashPassword(adminPassword);

            var user = new User
            {
                Username = adminUsername,
                Email = "admin@example.com",
                PasswordHash = passwordHash,
                PasswordSalt = salt
            };

            await userRepository.AddAsync(user);
            _logger.LogInformation("Admin user created successfully.");
        }
        else
        {
            _logger.LogInformation("Admin user already exists, skipping admin user creation.");
        }
    }
}
