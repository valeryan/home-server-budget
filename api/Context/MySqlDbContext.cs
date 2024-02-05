using BudgetApi.Models;
using Microsoft.EntityFrameworkCore;

namespace BudgetApi.Context
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
        public DbSet<Schedule> Schedules { get; set; }
        public DbSet<Transaction> Transactions { get; set; }

        // Add more DbSet properties as needed for other entities

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Income Budget, and Expense to Schedule
            modelBuilder
                .Entity<Income>()
                .HasOne(i => i.Schedule)
                .WithMany()
                .HasForeignKey(i => i.ScheduleId)
                .IsRequired();

            modelBuilder
                .Entity<Expense>()
                .HasOne(e => e.Schedule)
                .WithMany()
                .HasForeignKey(e => e.ScheduleId)
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

            // Transaction to Account
            modelBuilder
                .Entity<Transaction>()
                .HasOne(t => t.Account)
                .WithMany()
                .HasForeignKey(t => t.AccountId)
                .IsRequired();

            // Transaction to BudgetPeriod
            modelBuilder
                .Entity<Transaction>()
                .HasOne(t => t.BudgetPeriod)
                .WithMany()
                .HasForeignKey(t => t.BudgetPeriodId)
                .IsRequired();

            // Transaction to Income or Expense (optional)
            modelBuilder.Entity<Transaction>()
                .HasOne(t => t.Income)
                .WithMany(i => i.Transactions)
                .HasForeignKey(t => t.IncomeId);

            modelBuilder.Entity<Transaction>()
                .HasOne(t => t.Expense)
                .WithMany(e => e.Transactions)
                .HasForeignKey(t => t.ExpenseId);

            // BudgetPeriod to Budget
            modelBuilder
                .Entity<BudgetPeriod>()
                .HasOne(bp => bp.Budget)
                .WithMany(b => b.BudgetPeriods)
                .HasForeignKey(bp => bp.BudgetId)
                .IsRequired();

             // Expense entity - ScheduleParams as JSON
            modelBuilder.Entity<Expense>()
                .Property(e => e.ScheduleParams)
                .HasColumnType("json");

            // Income entity - ScheduleParams as JSON
            modelBuilder.Entity<Income>()
                .Property(i => i.ScheduleParams)
                .HasColumnType("json");

            // Budget entity - ScheduleParams as JSON
            modelBuilder.Entity<Budget>()
                .Property(b => b.ScheduleParams)
                .HasColumnType("json");

            base.OnModelCreating(modelBuilder);
        }
    }
}
