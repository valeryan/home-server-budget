namespace BudgetApp.Domain.Entities
{
    public abstract class Category : ApplicationData
    {
        public ICollection<Transaction>? Transactions { get; set; }
    }
}
