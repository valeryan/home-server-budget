namespace BudgetApp.Domain.Entities;

public class User
{
    public int Id { get; set; }
    public required string Username { get; set; }
    public string? Email { get; set; }
    public string? PasswordHash { get; set; }
    public string? PasswordSalt { get; set; }
    public ICollection<ExternalLogin> ExternalLogins { get; set; } = [];
}
