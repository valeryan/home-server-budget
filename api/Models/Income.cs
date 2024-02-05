namespace BudgetApi.Models
{
    public class Income
    {
        public int IncomeId { get; set; }
        public required string Name { get; set; }
        public decimal Amount { get; set; }
        public int ScheduleId { get; set; }
        public string? ScheduleParams { get; set; }

        // Navigation Properties
        public required Schedule Schedule { get; set; }

        public required ICollection<Transaction> Transactions { get; set; }
    }
}
