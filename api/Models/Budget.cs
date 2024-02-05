namespace BudgetApi.Models
{
    public class Budget
    {
        public int BudgetId { get; set; }
        public required string Name { get; set; }
        public int ScheduleId { get; set; }
        public string? ScheduleParams { get; set; }

        // Navigation Properties
        public required Schedule Schedule { get; set; }
        public required BudgetPeriod[] BudgetPeriods { get; set; }
    }
}
