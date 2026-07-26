using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarFlow.API.Migrations
{
    /// <inheritdoc />
    public partial class Etapa3Securitate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSoldStage",
                table: "PipelineStages",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Dealerii existenti au deja o etapa "Vândută" cautata dupa nume in cod;
            // o marcam cu flagul nou, altfel inregistrarea unei vanzari ar esua.
            migrationBuilder.Sql("""
                UPDATE "PipelineStages" SET "IsSoldStage" = true WHERE "Name" = 'Vândută';
                """);

            migrationBuilder.CreateIndex(
                name: "IX_VehicleStatusHistory_DealershipId",
                table: "VehicleStatusHistory",
                column: "DealershipId");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_DealershipId",
                table: "Vehicles",
                column: "DealershipId");

            migrationBuilder.CreateIndex(
                name: "IX_VehiclePhotos_DealershipId",
                table: "VehiclePhotos",
                column: "DealershipId");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleDocuments_DealershipId",
                table: "VehicleDocuments",
                column: "DealershipId");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleCosts_DealershipId",
                table: "VehicleCosts",
                column: "DealershipId");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_DealershipId",
                table: "Sales",
                column: "DealershipId");

            migrationBuilder.CreateIndex(
                name: "IX_PipelineStages_DealershipId",
                table: "PipelineStages",
                column: "DealershipId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_DealershipId",
                table: "Notifications",
                column: "DealershipId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_VehicleStatusHistory_DealershipId",
                table: "VehicleStatusHistory");

            migrationBuilder.DropIndex(
                name: "IX_Vehicles_DealershipId",
                table: "Vehicles");

            migrationBuilder.DropIndex(
                name: "IX_VehiclePhotos_DealershipId",
                table: "VehiclePhotos");

            migrationBuilder.DropIndex(
                name: "IX_VehicleDocuments_DealershipId",
                table: "VehicleDocuments");

            migrationBuilder.DropIndex(
                name: "IX_VehicleCosts_DealershipId",
                table: "VehicleCosts");

            migrationBuilder.DropIndex(
                name: "IX_Sales_DealershipId",
                table: "Sales");

            migrationBuilder.DropIndex(
                name: "IX_PipelineStages_DealershipId",
                table: "PipelineStages");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_DealershipId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "IsSoldStage",
                table: "PipelineStages");
        }
    }
}
