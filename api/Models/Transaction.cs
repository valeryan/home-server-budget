namespace BudgetApi.Models
{
    public class Transaction
    {
        public int TransactionId { get; set; }
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public int AccountId { get; set; }
        public int BudgetPeriodId { get; set; }
        public int PayeeId { get; set; }
        public int CategoryId { get; set; }
        public int? IncomeId { get; set; }
        public int? ExpenseId { get; set; }

        // Navigation Properties
        public required Account Account { get; set; }
        public required BudgetPeriod BudgetPeriod { get; set; }
        public required Payee Payee { get; set; }
        public required Category Category { get; set; }
        public Income? Income { get; set; }
        public Expense? Expense { get; set; }
    }
}
