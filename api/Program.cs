using Asp.Versioning;
using BudgetApi.Context;
using BudgetApi.Swagger;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Swashbuckle.AspNetCore.SwaggerGen;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder
    .Services.AddApiVersioning(o =>
    {
        o.DefaultApiVersion = new ApiVersion(1, 0);
        o.ReportApiVersions = true;
        o.ApiVersionReader = new UrlSegmentApiVersionReader();
    })
    .AddApiExplorer(options =>
    {
        options.GroupNameFormat = "'v'VVV";
        options.SubstituteApiVersionInUrl = true;
    });

builder.Services.AddTransient<IConfigureOptions<SwaggerGenOptions>, ConfigureSwaggerOptions>();
builder.Services.AddSwaggerGen(options =>
{
    // Add a custom operation filter which sets default values
    options.OperationFilter<SwaggerDefaultValues>();
});

// Access the connection string from environment variables
string? connectionString = Environment.GetEnvironmentVariable("CONNECTION_STRING");
if (string.IsNullOrEmpty(connectionString))
{
    // Log an error or throw an exception, depending on your application's requirements
    Console.Error.WriteLine("Error: Connection string is missing or empty.");
    // Alternatively, you can throw an exception to stop the application startup
    throw new InvalidOperationException("Connection string is missing or empty.");
}
builder.Services.AddDbContext<MySqlDbContext>(options => {
    options.UseMySql(connectionString, ServerVersion.Parse("8.0.23-mysql"));
});

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
