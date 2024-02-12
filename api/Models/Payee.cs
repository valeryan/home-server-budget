namespace BudgetApi.Models
{
    public class Payee: ApplicationData
    {
        public Payee()
        {
            Discriminator = ApplicationDataType.Payee;
        }
    }
}
