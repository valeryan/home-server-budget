namespace BudgetApi.Models
{
    public class Income
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public decimal Amount { get; set; }
        public int ScheduleId { get; set; }
        public string? ScheduleParams { get; set; }
        public int CategoryId { get; set; }
        public int PayeeId { get; set; }

        // Navigation Properties
        public required Schedule Schedule { get; set; }
        public required Category Category { get; set; }
        public required Payee Payee { get; set; }
        public required ICollection<Transaction> Transactions { get; set; }
    }
}
