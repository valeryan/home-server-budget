using BudgetApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BudgetApp.Infrastructure.Context
{
    public class MySqlDbContext : DbContext
    {
        public MySqlDbContext(DbContextOptions<MySqlDbContext> options)
            : base(options) { }

        // Define your entities as DbSet properties
        public DbSet<Account> Accounts { get; set; }
        public DbSet<Balance> Balances { get; set; }
        public DbSet<Budget> Budgets { get; set; }
        public DbSet<BudgetPeriod> BudgetPeriods { get; set; }
        public DbSet<Expense> Expenses { get; set; }
        public DbSet<Income> Incomes { get; set; }
        public DbSet<ApplicationData> ApplicationData { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<ApplicationData> IncomeCategories { get; set; }
        public DbSet<ApplicationData> ExpenseCategories { get; set; }
        public DbSet<ApplicationData> Payees { get; set; }
        public DbSet<ApplicationData> Schedules { get; set; }

        // Add more DbSet properties as needed for other entities

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(MySqlDbContext).Assembly);

            modelBuilder
                .Entity<ApplicationData>()
                .HasDiscriminator<ApplicationDataType>("Type")
                .HasValue<Schedule>(ApplicationDataType.Schedule)
                .HasValue<Payee>(ApplicationDataType.Payee)
                .HasValue<IncomeCategory>(ApplicationDataType.IncomeCategory)
                .HasValue<ExpenseCategory>(ApplicationDataType.ExpenseCategory);

            modelBuilder.Entity<ApplicationData>().Property(a => a.Type).IsRequired();

            // Seed schedules
            modelBuilder
                .Entity<Schedule>()
                .HasData(
                    new Schedule
                    {
                        Id = 1,
                        Name = "Weekly",
                        Description = "Occurs every week"
                    },
                    new Schedule
                    {
                        Id = 2,
                        Name = "Bi-weekly",
                        Description = "Occurs every two weeks"
                    },
                    new Schedule
                    {
                        Id = 3,
                        Name = "Monthly",
                        Description = "Occurs every month"
                    },
                    new Schedule
                    {
                        Id = 4,
                        Name = "Bi-monthly (1st and 15th)",
                        Description = "Occurs on the 1st and 15th of each month"
                    },
                    new Schedule
                    {
                        Id = 5,
                        Name = "Bi-monthly (15th and last day)",
                        Description = "Occurs on the 15th and last day of each month"
                    },
                    new Schedule
                    {
                        Id = 6,
                        Name = "Quarterly",
                        Description = "Occurs every three months"
                    },
                    new Schedule
                    {
                        Id = 7,
                        Name = "Semi-annually",
                        Description = "Occurs every six months"
                    },
                    new Schedule
                    {
                        Id = 8,
                        Name = "Annually",
                        Description = "Occurs every year"
                    }
                );

            // Seed income categories
            modelBuilder
                .Entity<IncomeCategory>()
                .HasData(
                    new IncomeCategory
                    {
                        Id = 9,
                        Name = "Regular Pay",
                        Description = "Regular income from employment"
                    },
                    new IncomeCategory
                    {
                        Id = 10,
                        Name = "Bonus",
                        Description = "Additional income received as a bonus"
                    },
                    new IncomeCategory
                    {
                        Id = 11,
                        Name = "Investment Income",
                        Description = "Income generated from investments"
                    },
                    new IncomeCategory
                    {
                        Id = 12,
                        Name = "Rental Income",
                        Description = "Income from renting out property or assets"
                    },
                    new IncomeCategory
                    {
                        Id = 13,
                        Name = "Other Income",
                        Description = "Miscellaneous income"
                    }
                );
            // Seed Expense categories
            modelBuilder
                .Entity<ExpenseCategory>()
                .HasData(
                    new ExpenseCategory
                    {
                        Id = 14,
                        Name = "Food",
                        Description = "Expenses related to groceries and dining out"
                    },
                    new ExpenseCategory
                    {
                        Id = 15,
                        Name = "Utilities",
                        Description = "Expenses related to electricity, water, gas, etc."
                    },
                    new ExpenseCategory
                    {
                        Id = 16,
                        Name = "Housing",
                        Description = "Expenses related to rent, mortgage, or property taxes"
                    },
                    new ExpenseCategory
                    {
                        Id = 17,
                        Name = "Transportation",
                        Description =
                            "Expenses related to transportation, such as fuel, public transit, or vehicle maintenance"
                    },
                    new ExpenseCategory
                    {
                        Id = 18,
                        Name = "Entertainment",
                        Description =
                            "Expenses related to leisure activities, such as movies, concerts, or streaming services"
                    },
                    new ExpenseCategory
                    {
                        Id = 19,
                        Name = "Healthcare",
                        Description =
                            "Expenses related to medical care, prescriptions, or health insurance"
                    },
                    new ExpenseCategory
                    {
                        Id = 20,
                        Name = "Personal Care",
                        Description =
                            "Expenses related to personal grooming, such as haircuts or skincare products"
                    },
                    new ExpenseCategory
                    {
                        Id = 21,
                        Name = "Education",
                        Description = "Expenses related to tuition, books, or educational materials"
                    },
                    new ExpenseCategory
                    {
                        Id = 22,
                        Name = "Debt",
                        Description =
                            "Expenses related to debt repayment, such as credit card bills or loan payments"
                    },
                    new ExpenseCategory
                    {
                        Id = 23,
                        Name = "Other",
                        Description = "Miscellaneous"
                    }
                );

            // Income Budget, and Expense to Schedule
            modelBuilder
                .Entity<Income>()
                .HasOne(i => i.Schedule)
                .WithMany()
                .HasForeignKey(i => i.ScheduleId)
                .IsRequired();

            modelBuilder
                .Entity<Income>()
                .HasOne(i => i.Payee)
                .WithMany()
                .HasForeignKey(i => i.PayeeId)
                .IsRequired();

            modelBuilder
                .Entity<Income>()
                .HasOne(i => i.Category)
                .WithMany()
                .HasForeignKey(i => i.CategoryId)
                .IsRequired();

            modelBuilder
                .Entity<Expense>()
                .HasOne(e => e.Schedule)
                .WithMany()
                .HasForeignKey(e => e.ScheduleId)
                .IsRequired();

            modelBuilder
                .Entity<Expense>()
                .HasOne(e => e.Payee)
                .WithMany()
                .HasForeignKey(e => e.PayeeId)
                .IsRequired();

            modelBuilder
                .Entity<Expense>()
                .HasOne(e => e.Category)
                .WithMany()
                .HasForeignKey(e => e.CategoryId)
                .IsRequired();

            modelBuilder
                .Entity<Budget>()
                .HasOne(e => e.Schedule)
                .WithMany()
                .HasForeignKey(e => e.ScheduleId)
                .IsRequired();

            // Expense to Balance (optional)
            modelBuilder
                .Entity<Expense>()
                .HasOne(e => e.Balance)
                .WithMany()
                .HasForeignKey(e => e.BalanceId);

            // Account to Balance
            modelBuilder
                .Entity<Account>()
                .HasOne(e => e.Balance)
                .WithMany()
                .HasForeignKey(e => e.BalanceId)
                .IsRequired();

            // Transaction
            modelBuilder
                .Entity<Transaction>()
                .HasOne(t => t.Account)
                .WithMany()
                .HasForeignKey(t => t.AccountId)
                .IsRequired();

            modelBuilder
                .Entity<Transaction>()
                .HasOne(t => t.BudgetPeriod)
                .WithMany()
                .HasForeignKey(t => t.BudgetPeriodId)
                .IsRequired();

            modelBuilder
                .Entity<Transaction>()
                .HasOne(t => t.Payee)
                .WithMany()
                .HasForeignKey(t => t.PayeeId)
                .IsRequired();

            modelBuilder
                .Entity<Transaction>()
                .HasOne(t => t.Category)
                .WithMany(t => t.Transactions)
                .HasForeignKey(t => t.CategoryId)
                .IsRequired();

            // BudgetPeriod to Budget
            modelBuilder
                .Entity<BudgetPeriod>()
                .HasOne(bp => bp.Budget)
                .WithMany(b => b.BudgetPeriods)
                .HasForeignKey(bp => bp.BudgetId)
                .IsRequired();

            // Expense entity - ScheduleParams as JSON
            modelBuilder.Entity<Expense>().Property(e => e.ScheduleParams).HasColumnType("json");

            // Income entity - ScheduleParams as JSON
            modelBuilder.Entity<Income>().Property(i => i.ScheduleParams).HasColumnType("json");

            // Budget entity - ScheduleParams as JSON
            modelBuilder.Entity<Budget>().Property(b => b.ScheduleParams).HasColumnType("json");

            base.OnModelCreating(modelBuilder);
        }
    }
}
