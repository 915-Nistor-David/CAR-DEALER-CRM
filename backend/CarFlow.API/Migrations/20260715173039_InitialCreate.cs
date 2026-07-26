using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CarFlow.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Dealerships",
                columns: table => new
                {
                    DealershipId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Dealerships", x => x.DealershipId);
                });

            migrationBuilder.CreateTable(
                name: "PipelineStages",
                columns: table => new
                {
                    StageId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DealershipId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PipelineStages", x => x.StageId);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DealershipId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    Role = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_Users_Dealerships_DealershipId",
                        column: x => x.DealershipId,
                        principalTable: "Dealerships",
                        principalColumn: "DealershipId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Vehicles",
                columns: table => new
                {
                    VehicleId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DealershipId = table.Column<int>(type: "integer", nullable: false),
                    Vin = table.Column<string>(type: "text", nullable: true),
                    Make = table.Column<string>(type: "text", nullable: false),
                    Model = table.Column<string>(type: "text", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Km = table.Column<int>(type: "integer", nullable: false),
                    PurchasePrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    AcquisitionSource = table.Column<string>(type: "text", nullable: true),
                    CurrentStageId = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vehicles", x => x.VehicleId);
                    table.ForeignKey(
                        name: "FK_Vehicles_PipelineStages_CurrentStageId",
                        column: x => x.CurrentStageId,
                        principalTable: "PipelineStages",
                        principalColumn: "StageId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Sales",
                columns: table => new
                {
                    SaleId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DealershipId = table.Column<int>(type: "integer", nullable: false),
                    VehicleId = table.Column<int>(type: "integer", nullable: false),
                    SalePrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    SaleDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    FinancingPartner = table.Column<string>(type: "text", nullable: true),
                    FinancingTerms = table.Column<string>(type: "text", nullable: true),
                    BuyerName = table.Column<string>(type: "text", nullable: false),
                    BuyerPhone = table.Column<string>(type: "text", nullable: true),
                    DocsHandedOver = table.Column<bool>(type: "boolean", nullable: false),
                    PlatesDone = table.Column<bool>(type: "boolean", nullable: false),
                    WarrantyGiven = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sales", x => x.SaleId);
                    table.ForeignKey(
                        name: "FK_Sales_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "VehicleId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VehicleCosts",
                columns: table => new
                {
                    CostId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DealershipId = table.Column<int>(type: "integer", nullable: false),
                    VehicleId = table.Column<int>(type: "integer", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleCosts", x => x.CostId);
                    table.ForeignKey(
                        name: "FK_VehicleCosts_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "VehicleId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VehiclePhotos",
                columns: table => new
                {
                    PhotoId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DealershipId = table.Column<int>(type: "integer", nullable: false),
                    VehicleId = table.Column<int>(type: "integer", nullable: false),
                    FilePath = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehiclePhotos", x => x.PhotoId);
                    table.ForeignKey(
                        name: "FK_VehiclePhotos_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "VehicleId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VehicleStatusHistory",
                columns: table => new
                {
                    HistoryId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DealershipId = table.Column<int>(type: "integer", nullable: false),
                    VehicleId = table.Column<int>(type: "integer", nullable: false),
                    FromStageId = table.Column<int>(type: "integer", nullable: true),
                    ToStageId = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Note = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleStatusHistory", x => x.HistoryId);
                    table.ForeignKey(
                        name: "FK_VehicleStatusHistory_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "VehicleId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Sales_VehicleId",
                table: "Sales",
                column: "VehicleId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_DealershipId",
                table: "Users",
                column: "DealershipId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VehicleCosts_VehicleId",
                table: "VehicleCosts",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_VehiclePhotos_VehicleId",
                table: "VehiclePhotos",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_CurrentStageId",
                table: "Vehicles",
                column: "CurrentStageId");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleStatusHistory_VehicleId",
                table: "VehicleStatusHistory",
                column: "VehicleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Sales");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "VehicleCosts");

            migrationBuilder.DropTable(
                name: "VehiclePhotos");

            migrationBuilder.DropTable(
                name: "VehicleStatusHistory");

            migrationBuilder.DropTable(
                name: "Dealerships");

            migrationBuilder.DropTable(
                name: "Vehicles");

            migrationBuilder.DropTable(
                name: "PipelineStages");
        }
    }
}
