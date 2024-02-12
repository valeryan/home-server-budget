namespace BudgetApi.Models
{
    public class Budget
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public int ScheduleId { get; set; }
        public string? ScheduleParams { get; set; }

        // Navigation Properties
        public required Schedule Schedule { get; set; }
        public required BudgetPeriod[] BudgetPeriods { get; set; }
    }
}
