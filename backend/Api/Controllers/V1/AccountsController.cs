using Asp.Versioning;
using BudgetApp.Application.DTOs;
using BudgetApp.Application.Features.Accounts.Commands.CreateAccount;
using BudgetApp.Application.Features.Accounts.Queries.GetAccount;
using BudgetApp.Application.Features.Accounts.Queries.GetAccountList;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BudgetApp.Api.Controllers.V1
{
    [Route("v{version:apiVersion}/[controller]")]
    [ApiVersion("1.0")]
    [ApiController]
    public class AccountsController(IMediator mediator) : ControllerBase
    {
        private readonly IMediator _mediator = mediator;

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var query = new GetAccountListQuery();
            var accounts = await _mediator.Send(query);
            return Ok(accounts);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<AccountDto>> GetById(int id)
        {
            var query = new GetAccountQuery { Id = id };
            var result = await _mediator.Send(query);
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<AccountDto>> Create(AccountDto accountDto)
        {
            var command = new CreateAccountCommand { Account = accountDto };
            var result = await _mediator.Send(command);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
    }
}
