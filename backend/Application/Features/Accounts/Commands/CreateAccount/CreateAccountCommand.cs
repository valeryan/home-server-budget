using BudgetApp.Application.DTOs;
using MediatR;

namespace BudgetApp.Application.Features.Accounts.Commands.CreateAccount;

public class CreateAccountCommand : IRequest<AccountDto>
{
    public required AccountDto Account { get; set; }
}
