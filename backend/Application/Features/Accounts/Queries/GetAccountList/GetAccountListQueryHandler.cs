using BudgetApp.Application.DTOs;
using BudgetApp.Domain.Contracts.Persistence.Repositories;
using BudgetApp.Domain.Entities;
using MediatR;

namespace BudgetApp.Application.Features.Accounts.Queries.GetAccountList;

public class GetAccountListQueryHandler(IAsyncRepository<Account> accountRepository)
    : IRequestHandler<GetAccountListQuery, List<AccountDto>>
{
    private readonly IAsyncRepository<Account> _accountRepository = accountRepository;

    public async Task<List<AccountDto>> Handle(
        GetAccountListQuery request,
        CancellationToken cancellationToken
    )
    {
        var Accounts = await _accountRepository.ListAllAsync();

        return Accounts
            .Select(account => new AccountDto
            {
                Id = account.Id,
                Name = account.Name,
                Description = account.Description,
                Balance = new BalanceDto
                {
                    Id = account.Balance.Id,
                    StartingBalance = account.Balance.StartBalance,
                    CurrentBalance = account.Balance.CurrentBalance,
                    InterestRate = account.Balance.InterestRate,
                }
            })
            .ToList();
    }
}
