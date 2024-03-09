using BudgetApp.Domain.Contracts.Persistence;
using MediatR;

namespace BudgetApp.Application.Features.Accounts.Queries.GetAccountList
{
    public class GetAccountsListQueryHandler(IAccountRepository accountRepository) : IRequestHandler<GetAccountsListQuery, List<AccountDto>>
    {
        private readonly IAccountRepository _accountRepository = accountRepository;

        public async Task<List<AccountDto>> Handle(GetAccountsListQuery request, CancellationToken cancellationToken)
        {
            var Accounts = await _accountRepository.ListAllAsync();

            return Accounts.Select(a => new AccountDto
            {
                Id = a.Id,
                Name = a.Name,
                Description = a.Description,
                BalanceId = a.BalanceId
            }).ToList();
        }
    }
}
