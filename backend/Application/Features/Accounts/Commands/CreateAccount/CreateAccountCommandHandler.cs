using BudgetApp.Application.DTOs;
using BudgetApp.Domain.Contracts.Persistence.Repositories;
using BudgetApp.Domain.Entities;
using MediatR;

namespace BudgetApp.Application.Features.Accounts.Commands.CreateAccount;

public class CreateAccountCommandHandler(IAsyncRepository<Account> accountRepository)
    : IRequestHandler<CreateAccountCommand, AccountDto>
{
    private readonly IAsyncRepository<Account> _accountRepository = accountRepository;

    public async Task<AccountDto> Handle(
        CreateAccountCommand request,
        CancellationToken cancellationToken
    )
    {
        var balance = new Balance
        {
            StartBalance = 0,
            CurrentBalance = 0,
            InterestRate = 0
        };

        if (request.Account.Balance != null)
        {
            balance = new Balance
            {
                StartBalance = request.Account.Balance.StartingBalance,
                CurrentBalance = request.Account.Balance.CurrentBalance,
                InterestRate = request.Account.Balance.InterestRate
            };
        }
        var account = new Account
        {
            Name = request.Account.Name,
            Description = request.Account.Description,
            Balance = balance
        };

        var createdAccount = await _accountRepository.AddAsync(account);

        // Map the created account entity to a DTO
        var createdAccountDto = new AccountDto
        {
            Id = createdAccount.Id,
            Name = createdAccount.Name,
            Description = createdAccount.Description,
            Balance = new BalanceDto
            {
                Id = createdAccount.Balance.Id,
                StartingBalance = createdAccount.Balance.StartBalance,
                CurrentBalance = createdAccount.Balance.CurrentBalance,
                InterestRate = createdAccount.Balance.InterestRate
            }
        };

        return createdAccountDto;
    }
}
