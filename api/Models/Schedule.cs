namespace BudgetApi.Models
{
    public class Schedule: ApplicationData
    {
        public Schedule()
        {
            Discriminator = ApplicationDataType.Schedule;
        }
    }
}
