namespace BudgetApp.Application.DTOs;

public class BalanceDto
{
    public int? Id { get; set; }
    public decimal StartingBalance { get; set; }
    public decimal CurrentBalance { get; set; }
    public decimal InterestRate { get; set; }
}
