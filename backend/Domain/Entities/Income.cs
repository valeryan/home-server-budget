namespace BudgetApp.Domain.Entities;

public class Income
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public decimal Amount { get; set; }
    public int ScheduleId { get; set; }
    public string? ScheduleParams { get; set; }
    public int CategoryId { get; set; }
    public int PayeeId { get; set; }

    // Navigation Properties
    public required Schedule Schedule { get; set; }
    public required IncomeCategory Category { get; set; }
    public required Payee Payee { get; set; }
}
