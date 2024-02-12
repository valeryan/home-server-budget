namespace BudgetApi.Models
{
    public abstract class ApplicationData
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public string? Description { get; set; }
        public virtual ApplicationDataType Discriminator { get; set; }
    }
}
