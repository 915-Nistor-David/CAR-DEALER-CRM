using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarFlow.API.Migrations
{
    /// <inheritdoc />
    public partial class AutorCosturi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CreatedByUserId",
                table: "VehicleCosts",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "VehicleCosts");
        }
    }
}
