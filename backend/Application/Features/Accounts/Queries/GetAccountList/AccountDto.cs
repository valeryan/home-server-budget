
namespace BudgetApp.Application.Features.Accounts.Queries.GetAccountList
{
    public class AccountDto
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public string? Description { get; set; }
        public int BalanceId { get; set; }
    }
}
