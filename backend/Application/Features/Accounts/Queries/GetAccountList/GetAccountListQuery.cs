using BudgetApp.Application.DTOs;
using MediatR;

namespace BudgetApp.Application.Features.Accounts.Queries.GetAccountList
{
    public class GetAccountListQuery : IRequest<List<AccountDto>>
    {

    }
}
