namespace BudgetApi.Models
{
    public class Category: ApplicationData
    {
        public Category()
        {
            Discriminator = ApplicationDataType.Category;
        }
    }
}
