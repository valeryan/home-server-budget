namespace BudgetApi.Models
{
    public class Balance
    {
        public int BalanceId { get; set; }
        public decimal StartBalance { get; set; }
        public decimal CurrentBalance { get; set; }
        public decimal InterestRate { get; set; }
    }
}