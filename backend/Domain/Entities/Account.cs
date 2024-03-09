namespace BudgetApp.Domain.Entities
{
    public class Account
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public string? Description { get; set; }
        public int BalanceId { get; set; }

        // Navigation Properties
        public required Balance Balance { get; set; }
    }
}
