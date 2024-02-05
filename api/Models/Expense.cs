namespace BudgetApi.Models
{
    public class Expense
    {
        public int ExpenseId { get; set; }
        public required string Name { get; set; }
        public decimal Amount { get; set; }
        public int ScheduleId { get; set; }
        public string? ScheduleParams { get; set; }
        public bool HasBalance { get; set; }
        public int? BalanceId { get; set; }

        // Navigation Properties
        public required Schedule Schedule { get; set; }
        public Balance? Balance { get; set; }

        public required ICollection<Transaction> Transactions { get; set; }
    }
}
