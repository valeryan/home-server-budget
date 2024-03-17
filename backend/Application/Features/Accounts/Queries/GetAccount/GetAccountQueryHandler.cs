using BudgetApp.Application.DTOs;
using BudgetApp.Domain.Contracts.Persistence.Repositories;
using BudgetApp.Domain.Entities;
using MediatR;

namespace BudgetApp.Application.Features.Accounts.Queries.GetAccount
{
    public class GetAccountQueryHandler(IAsyncRepository<Account> accountRepository) : IRequestHandler<GetAccountQuery, AccountDto?>
    {
        private readonly IAsyncRepository<Account> _accountRepository = accountRepository;

        public async Task<AccountDto?> Handle(GetAccountQuery request, CancellationToken cancellationToken)
        {
            var account = await _accountRepository.GetByIdAsync(request.Id);
            if (account == null)
            {
                return null;
            }

            var accountDto = new AccountDto
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
            };

            return accountDto;
        }
    }
}
