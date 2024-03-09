using MediatR;
using Microsoft.AspNetCore.Mvc;
using BudgetApp.Application.Features.Accounts.Queries.GetAccountList;
using Asp.Versioning;

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
            var query = new GetAccountsListQuery();
            var accounts = await _mediator.Send(query);
            return Ok(accounts);
        }
    }
}
