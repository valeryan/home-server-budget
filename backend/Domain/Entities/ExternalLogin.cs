namespace BudgetApp.Domain.Entities;

public class ExternalLogin
{
    public int Id { get; set; }
    public required string LoginProvider { get; set; }
    public required string ProviderKey { get; set; }
    public string? ProviderDisplayName { get; set; }
    public int UserId { get; set; }
    public required User User { get; set; }
}
