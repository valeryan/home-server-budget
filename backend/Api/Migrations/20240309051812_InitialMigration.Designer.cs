﻿// <auto-generated />
using System;
using BudgetApp.Infrastructure.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

#nullable disable

namespace BudgetApp.Api.Migrations
{
    [DbContext(typeof(MySqlDbContext))]
    [Migration("20240309051812_InitialMigration")]
    partial class InitialMigration
    {
        /// <inheritdoc />
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "7.0.2")
                .HasAnnotation("Relational:MaxIdentifierLength", 64);

            modelBuilder.Entity("BudgetApp.Domain.Entities.Account", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    b.Property<int>("BalanceId")
                        .HasColumnType("int");

                    b.Property<string>("Description")
                        .HasColumnType("longtext");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasColumnType("longtext");

                    b.HasKey("Id");

                    b.HasIndex("BalanceId");

                    b.ToTable("Accounts");
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.ApplicationData", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    b.Property<string>("Description")
                        .HasColumnType("longtext");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasColumnType("longtext");

                    b.Property<int>("Type")
                        .HasColumnType("int");

                    b.HasKey("Id");

                    b.ToTable("ApplicationData");

                    b.HasDiscriminator<int>("Type");

                    b.UseTphMappingStrategy();
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.Balance", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    b.Property<decimal>("CurrentBalance")
                        .HasColumnType("decimal(65,30)");

                    b.Property<decimal>("InterestRate")
                        .HasColumnType("decimal(65,30)");

                    b.Property<decimal>("StartBalance")
                        .HasColumnType("decimal(65,30)");

                    b.HasKey("Id");

                    b.ToTable("Balances");
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.Budget", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasColumnType("longtext");

                    b.Property<int>("ScheduleId")
                        .HasColumnType("int");

                    b.Property<string>("ScheduleParams")
                        .HasColumnType("json");

                    b.HasKey("Id");

                    b.HasIndex("ScheduleId");

                    b.ToTable("Budgets");
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.BudgetPeriod", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    b.Property<int>("BudgetId")
                        .HasColumnType("int");

                    b.Property<DateTime>("EndDate")
                        .HasColumnType("datetime(6)");

                    b.Property<DateTime>("StartDate")
                        .HasColumnType("datetime(6)");

                    b.HasKey("Id");

                    b.HasIndex("BudgetId");

                    b.ToTable("BudgetPeriods");
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.Expense", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    b.Property<decimal>("Amount")
                        .HasColumnType("decimal(65,30)");

                    b.Property<int?>("BalanceId")
                        .HasColumnType("int");

                    b.Property<int>("CategoryId")
                        .HasColumnType("int");

                    b.Property<bool>("HasBalance")
                        .HasColumnType("tinyint(1)");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasColumnType("longtext");

                    b.Property<int>("PayeeId")
                        .HasColumnType("int");

                    b.Property<int>("ScheduleId")
                        .HasColumnType("int");

                    b.Property<string>("ScheduleParams")
                        .HasColumnType("json");

                    b.HasKey("Id");

                    b.HasIndex("BalanceId");

                    b.HasIndex("CategoryId");

                    b.HasIndex("PayeeId");

                    b.HasIndex("ScheduleId");

                    b.ToTable("Expenses");
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.Income", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    b.Property<decimal>("Amount")
                        .HasColumnType("decimal(65,30)");

                    b.Property<int>("CategoryId")
                        .HasColumnType("int");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasColumnType("longtext");

                    b.Property<int>("PayeeId")
                        .HasColumnType("int");

                    b.Property<int>("ScheduleId")
                        .HasColumnType("int");

                    b.Property<string>("ScheduleParams")
                        .HasColumnType("json");

                    b.HasKey("Id");

                    b.HasIndex("CategoryId");

                    b.HasIndex("PayeeId");

                    b.HasIndex("ScheduleId");

                    b.ToTable("Incomes");
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.Transaction", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    b.Property<int>("AccountId")
                        .HasColumnType("int");

                    b.Property<decimal>("Amount")
                        .HasColumnType("decimal(65,30)");

                    b.Property<int>("BudgetPeriodId")
                        .HasColumnType("int");

                    b.Property<int>("CategoryId")
                        .HasColumnType("int");

                    b.Property<DateTime>("Date")
                        .HasColumnType("datetime(6)");

                    b.Property<int>("PayeeId")
                        .HasColumnType("int");

                    b.Property<int?>("SourceId")
                        .HasColumnType("int");

                    b.Property<int?>("SourceType")
                        .HasColumnType("int");

                    b.Property<int>("Type")
                        .HasColumnType("int");

                    b.HasKey("Id");

                    b.HasIndex("AccountId");

                    b.HasIndex("BudgetPeriodId");

                    b.HasIndex("CategoryId");

                    b.HasIndex("PayeeId");

                    b.ToTable("Transactions");
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.Category", b =>
                {
                    b.HasBaseType("BudgetApp.Domain.Entities.ApplicationData");
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.Payee", b =>
                {
                    b.HasBaseType("BudgetApp.Domain.Entities.ApplicationData");

                    b.HasDiscriminator().HasValue(2);
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.Schedule", b =>
                {
                    b.HasBaseType("BudgetApp.Domain.Entities.ApplicationData");

                    b.HasDiscriminator().HasValue(1);

                    b.HasData(
                        new
                        {
                            Id = 1,
                            Description = "Occurs every week",
                            Name = "Weekly",
                            Type = 1
                        },
                        new
                        {
                            Id = 2,
                            Description = "Occurs every two weeks",
                            Name = "Bi-weekly",
                            Type = 1
                        },
                        new
                        {
                            Id = 3,
                            Description = "Occurs every month",
                            Name = "Monthly",
                            Type = 1
                        },
                        new
                        {
                            Id = 4,
                            Description = "Occurs on the 1st and 15th of each month",
                            Name = "Bi-monthly (1st and 15th)",
                            Type = 1
                        },
                        new
                        {
                            Id = 5,
                            Description = "Occurs on the 15th and last day of each month",
                            Name = "Bi-monthly (15th and last day)",
                            Type = 1
                        },
                        new
                        {
                            Id = 6,
                            Description = "Occurs every three months",
                            Name = "Quarterly",
                            Type = 1
                        },
                        new
                        {
                            Id = 7,
                            Description = "Occurs every six months",
                            Name = "Semi-annually",
                            Type = 1
                        },
                        new
                        {
                            Id = 8,
                            Description = "Occurs every year",
                            Name = "Annually",
                            Type = 1
                        });
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.ExpenseCategory", b =>
                {
                    b.HasBaseType("BudgetApp.Domain.Entities.Category");

                    b.HasDiscriminator().HasValue(4);

                    b.HasData(
                        new
                        {
                            Id = 14,
                            Description = "Expenses related to groceries and dining out",
                            Name = "Food",
                            Type = 4
                        },
                        new
                        {
                            Id = 15,
                            Description = "Expenses related to electricity, water, gas, etc.",
                            Name = "Utilities",
                            Type = 4
                        },
                        new
                        {
                            Id = 16,
                            Description = "Expenses related to rent, mortgage, or property taxes",
                            Name = "Housing",
                            Type = 4
                        },
                        new
                        {
                            Id = 17,
                            Description = "Expenses related to transportation, such as fuel, public transit, or vehicle maintenance",
                            Name = "Transportation",
                            Type = 4
                        },
                        new
                        {
                            Id = 18,
                            Description = "Expenses related to leisure activities, such as movies, concerts, or streaming services",
                            Name = "Entertainment",
                            Type = 4
                        },
                        new
                        {
                            Id = 19,
                            Description = "Expenses related to medical care, prescriptions, or health insurance",
                            Name = "Healthcare",
                            Type = 4
                        },
                        new
                        {
                            Id = 20,
                            Description = "Expenses related to personal grooming, such as haircuts or skincare products",
                            Name = "Personal Care",
                            Type = 4
                        },
                        new
                        {
                            Id = 21,
                            Description = "Expenses related to tuition, books, or educational materials",
                            Name = "Education",
                            Type = 4
                        },
                        new
                        {
                            Id = 22,
                            Description = "Expenses related to debt repayment, such as credit card bills or loan payments",
                            Name = "Debt",
                            Type = 4
                        },
                        new
                        {
                            Id = 23,
                            Description = "Miscellaneous",
                            Name = "Other",
                            Type = 4
                        });
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.IncomeCategory", b =>
                {
                    b.HasBaseType("BudgetApp.Domain.Entities.Category");

                    b.HasDiscriminator().HasValue(3);

                    b.HasData(
                        new
                        {
                            Id = 9,
                            Description = "Regular income from employment",
                            Name = "Regular Pay",
                            Type = 3
                        },
                        new
                        {
                            Id = 10,
                            Description = "Additional income received as a bonus",
                            Name = "Bonus",
                            Type = 3
                        },
                        new
                        {
                            Id = 11,
                            Description = "Income generated from investments",
                            Name = "Investment Income",
                            Type = 3
                        },
                        new
                        {
                            Id = 12,
                            Description = "Income from renting out property or assets",
                            Name = "Rental Income",
                            Type = 3
                        },
                        new
                        {
                            Id = 13,
                            Description = "Miscellaneous income",
                            Name = "Other Income",
                            Type = 3
                        });
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.Account", b =>
                {
                    b.HasOne("BudgetApp.Domain.Entities.Balance", "Balance")
                        .WithMany()
                        .HasForeignKey("BalanceId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Balance");
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.Budget", b =>
                {
                    b.HasOne("BudgetApp.Domain.Entities.Schedule", "Schedule")
                        .WithMany()
                        .HasForeignKey("ScheduleId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Schedule");
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.BudgetPeriod", b =>
                {
                    b.HasOne("BudgetApp.Domain.Entities.Budget", "Budget")
                        .WithMany("BudgetPeriods")
                        .HasForeignKey("BudgetId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Budget");
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.Expense", b =>
                {
                    b.HasOne("BudgetApp.Domain.Entities.Balance", "Balance")
                        .WithMany()
                        .HasForeignKey("BalanceId");

                    b.HasOne("BudgetApp.Domain.Entities.ExpenseCategory", "Category")
                        .WithMany()
                        .HasForeignKey("CategoryId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("BudgetApp.Domain.Entities.Payee", "Payee")
                        .WithMany()
                        .HasForeignKey("PayeeId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("BudgetApp.Domain.Entities.Schedule", "Schedule")
                        .WithMany()
                        .HasForeignKey("ScheduleId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Balance");

                    b.Navigation("Category");

                    b.Navigation("Payee");

                    b.Navigation("Schedule");
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.Income", b =>
                {
                    b.HasOne("BudgetApp.Domain.Entities.IncomeCategory", "Category")
                        .WithMany()
                        .HasForeignKey("CategoryId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("BudgetApp.Domain.Entities.Payee", "Payee")
                        .WithMany()
                        .HasForeignKey("PayeeId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("BudgetApp.Domain.Entities.Schedule", "Schedule")
                        .WithMany()
                        .HasForeignKey("ScheduleId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Category");

                    b.Navigation("Payee");

                    b.Navigation("Schedule");
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.Transaction", b =>
                {
                    b.HasOne("BudgetApp.Domain.Entities.Account", "Account")
                        .WithMany()
                        .HasForeignKey("AccountId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("BudgetApp.Domain.Entities.BudgetPeriod", "BudgetPeriod")
                        .WithMany()
                        .HasForeignKey("BudgetPeriodId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("BudgetApp.Domain.Entities.Category", "Category")
                        .WithMany("Transactions")
                        .HasForeignKey("CategoryId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("BudgetApp.Domain.Entities.Payee", "Payee")
                        .WithMany()
                        .HasForeignKey("PayeeId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Account");

                    b.Navigation("BudgetPeriod");

                    b.Navigation("Category");

                    b.Navigation("Payee");
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.Budget", b =>
                {
                    b.Navigation("BudgetPeriods");
                });

            modelBuilder.Entity("BudgetApp.Domain.Entities.Category", b =>
                {
                    b.Navigation("Transactions");
                });
#pragma warning restore 612, 618
        }
    }
}