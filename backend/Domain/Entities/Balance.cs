namespace BudgetApp.Domain.Entities
{
    public class Balance
    {
        public int Id { get; set; }
        public decimal StartBalance { get; set; }
        public decimal CurrentBalance { get; set; }
        public decimal InterestRate { get; set; }
    }
}
