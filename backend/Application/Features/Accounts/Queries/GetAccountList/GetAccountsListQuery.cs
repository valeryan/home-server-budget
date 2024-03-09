using MediatR;

namespace BudgetApp.Application.Features.Accounts.Queries.GetAccountList
{
    public class GetAccountsListQuery : IRequest<List<AccountDto>>
    {

    }
}
