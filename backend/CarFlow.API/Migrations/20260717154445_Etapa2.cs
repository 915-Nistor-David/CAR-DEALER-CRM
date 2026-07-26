using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CarFlow.API.Migrations
{
    /// <inheritdoc />
    public partial class Etapa2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "RARDate",
                table: "Vehicles",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "RARReminderSentFor",
                table: "Vehicles",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StockAgingReminderSentAt",
                table: "Vehicles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StuckReminderSentAt",
                table: "Vehicles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "AlertDays",
                table: "PipelineStages",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsSaleReady",
                table: "PipelineStages",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "NotifyRole",
                table: "PipelineStages",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DefaultStageAlertDays",
                table: "Dealerships",
                type: "integer",
                nullable: false,
                defaultValue: 7);

            migrationBuilder.AddColumn<int>(
                name: "StockAlertDays",
                table: "Dealerships",
                type: "integer",
                nullable: false,
                defaultValue: 60);

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    NotificationId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DealershipId = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    LinkUrl = table.Column<string>(type: "text", nullable: true),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.NotificationId);
                    table.ForeignKey(
                        name: "FK_Notifications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VehicleDocuments",
                columns: table => new
                {
                    DocumentId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DealershipId = table.Column<int>(type: "integer", nullable: false),
                    VehicleId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    IsDone = table.Column<bool>(type: "boolean", nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: true),
                    ReminderSent = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleDocuments", x => x.DocumentId);
                    table.ForeignKey(
                        name: "FK_VehicleDocuments_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "VehicleId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId_IsRead",
                table: "Notifications",
                columns: new[] { "UserId", "IsRead" });

            migrationBuilder.CreateIndex(
                name: "IX_VehicleDocuments_VehicleId",
                table: "VehicleDocuments",
                column: "VehicleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "VehicleDocuments");

            migrationBuilder.DropColumn(
                name: "RARDate",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "RARReminderSentFor",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "StockAgingReminderSentAt",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "StuckReminderSentAt",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AlertDays",
                table: "PipelineStages");

            migrationBuilder.DropColumn(
                name: "IsSaleReady",
                table: "PipelineStages");

            migrationBuilder.DropColumn(
                name: "NotifyRole",
                table: "PipelineStages");

            migrationBuilder.DropColumn(
                name: "DefaultStageAlertDays",
                table: "Dealerships");

            migrationBuilder.DropColumn(
                name: "StockAlertDays",
                table: "Dealerships");
        }
    }
}
