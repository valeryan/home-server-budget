namespace BudgetApp.Domain.Entities;

public class BudgetPeriod
{
    public int Id { get; set; }
    public int BudgetId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    // Navigation Properties
    public required Budget Budget { get; set; }
}
