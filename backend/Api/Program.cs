using BudgetApp.Api.Extensions;
using BudgetApp.Application;
using BudgetApp.Infrastructure;

DotNetEnv.Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

var services = builder.Services;

// Add services to the container.
services.AddControllers();

services.ConfigureApi();

services.ConfigureSwagger();

services.AddApplication()
    .AddInfrastructure();

var app = builder.Build();

app.UsePathBase("/api");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        var descriptions = app.DescribeApiVersions();

        // Build a swagger endpoint for each discovered API version
        foreach (var description in descriptions)
        {
            var url = $"/api/swagger/{description.GroupName}/swagger.json";
            var name = description.GroupName.ToUpperInvariant();
            options.SwaggerEndpoint(url, name);
        }
    });
}

app.MapControllers();
app.Run();
