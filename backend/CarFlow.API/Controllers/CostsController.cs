using CarFlow.API.Costs;
using CarFlow.API.Data;
using CarFlow.API.Models;
using CarFlow.API.Vehicles;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarFlow.API.Controllers;

[ApiController]
[Route("api/vehicles/{vehicleId}/costs")]
[Authorize]
public class CostsController : ControllerBase
{
    private static readonly string[] AllowedCategories =
        { "Transport", "Service", "Piese", "Detailing", "Altele" };

    private readonly AppDbContext _db;

    public CostsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> Create(int vehicleId, CreateCostRequest req)
    {
        if (!AllowedCategories.Contains(req.Category))
            return BadRequest(new { message = "Categorie invalidă." });

        var vehicleExists = await _db.Vehicles.AnyAsync(v => v.VehicleId == vehicleId);
        if (!vehicleExists) return NotFound();

        var cost = new VehicleCost
        {
            VehicleId = vehicleId,
            Category = req.Category,
            Amount = req.Amount,
            Date = req.Date,
            Description = req.Description
        };
        _db.VehicleCosts.Add(cost);
        await _db.SaveChangesAsync();

        return Ok(new CostDto
        {
            CostId = cost.CostId,
            Category = cost.Category,
            Amount = cost.Amount,
            Date = cost.Date,
            Description = cost.Description
        });
    }

    [HttpDelete("{costId}")]
    public async Task<IActionResult> Delete(int vehicleId, int costId)
    {
        var cost = await _db.VehicleCosts
            .FirstOrDefaultAsync(c => c.CostId == costId && c.VehicleId == vehicleId);
        if (cost == null) return NotFound();

        _db.VehicleCosts.Remove(cost);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Costul a fost șters." });
    }
}
