namespace BudgetApp.Infrastructure.Models
{
    public abstract class Category : ApplicationData
    {
        public ICollection<Transaction>? Transactions { get; set; }
    }
}
