namespace BudgetApi.Models
{
    public class Transaction
    {
        public int TransactionId { get; set; }
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public int AccountId { get; set; }
        public int BudgetPeriodId { get; set; }

        // Navigation Properties
        public required Account Account { get; set; }
        public required BudgetPeriod BudgetPeriod { get; set; }

        public int? IncomeId { get; set; }
        public Income? Income { get; set; }

        public int? ExpenseId { get; set; }
        public Expense? Expense { get; set; }
    }
}
