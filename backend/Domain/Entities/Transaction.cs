namespace BudgetApp.Domain.Entities
{
    public class Transaction
    {
        public int Id { get; set; }
        public decimal Amount { get; set; }
        public TransactionType Type { get; set; }
        public DateTime Date { get; set; }
        public int AccountId { get; set; }
        public int BudgetPeriodId { get; set; }
        public int PayeeId { get; set; }
        public int CategoryId { get; set; }
        public int? SourceId { get; set; }
        public int? SourceType { get; set; }

        // Navigation Properties
        public required Account Account { get; set; }
        public required BudgetPeriod BudgetPeriod { get; set; }
        public required Payee Payee { get; set; }
        public required Category Category { get; set; }
    }
}
