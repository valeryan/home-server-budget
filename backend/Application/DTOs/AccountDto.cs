namespace BudgetApp.Application.DTOs
{
    public class AccountDto
    {
        public int? Id { get; set; }
        public required string Name { get; set; }
        public string? Description { get; set; }
        public BalanceDto? Balance { get; set; }
    }
}
