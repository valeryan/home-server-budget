namespace BudgetApp.Domain.Contracts.Services;

public interface IPasswordService
{
    (string PasswordHash, string Salt) HashPassword(string password);
    bool VerifyPassword(string password, string storedHash, string storedSalt);
}
