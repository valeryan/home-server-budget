using BudgetApp.Domain.Contracts.Services;

namespace BudgetApp.Infrastructure.Services
{
    public class PasswordService : IPasswordService
    {
        public (string PasswordHash, string Salt) HashPassword(string password)
        {
            using var hmac = new System.Security.Cryptography.HMACSHA512();
            var salt = Convert.ToBase64String(hmac.Key);
            var hash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
            return (PasswordHash: Convert.ToBase64String(hash), Salt: salt);
        }

        public bool VerifyPassword(string password, string storedHash, string storedSalt)
        {
            var saltBytes = Convert.FromBase64String(storedSalt);
            using var hmac = new System.Security.Cryptography.HMACSHA512(saltBytes);
            var computedHash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
            var computedHashString = Convert.ToBase64String(computedHash);
            return computedHashString == storedHash;
        }
    }
}
