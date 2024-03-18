using BudgetApp.Application.DTOs;
using MediatR;

namespace BudgetApp.Application.Features.Accounts.Queries.GetAccount;

public class GetAccountQuery : IRequest<AccountDto>
{
    public int Id { get; set; }
}
