using CarFlow.API.Common;
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
    private readonly ITenantProvider _tenant;
    private readonly INotificationService _notifications;

    public CostsController(AppDbContext db, ITenantProvider tenant, INotificationService notifications)
    {
        _db = db;
        _tenant = tenant;
        _notifications = notifications;
    }

    [HttpPost]
    public async Task<IActionResult> Create(int vehicleId, CreateCostRequest req)
    {
        if (!AllowedCategories.Contains(req.Category))
            return BadRequest(new { message = "Categorie invalidă." });

        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.VehicleId == vehicleId);
        if (vehicle == null) return NotFound();

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

        await NotifyOwnerAsync(vehicle, cost, added: true);

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

        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.VehicleId == vehicleId);

        _db.VehicleCosts.Remove(cost);
        await _db.SaveChangesAsync();

        if (vehicle != null)
            await NotifyOwnerAsync(vehicle, cost, added: false);

        return Ok(new { message = "Costul a fost șters." });
    }

    // Patronul cere explicit sa afle cand cineva cheltuie pe o masina.
    // Stergerea e la fel de sensibila ca adaugarea, deci notifica si ea.
    // Excludem autorul: patronul nu are ce afla de la propriile costuri.
    private async Task NotifyOwnerAsync(Vehicle vehicle, VehicleCost cost, bool added)
    {
        var actor = await _db.Users
            .Where(u => u.UserId == _tenant.UserId)
            .Select(u => u.Name)
            .FirstOrDefaultAsync() ?? "Cineva";

        var verb = added ? "a adăugat" : "a șters";
        var prefix = added ? "Cost nou" : "Cost șters";
        var description = string.IsNullOrWhiteSpace(cost.Description)
            ? ""
            : $" — „{cost.Description}”";

        await _notifications.NotifyRolesAsync(_tenant.DealershipId, new[] { "Owner" },
            NotificationTypes.Cost,
            $"{prefix}: {cost.Amount:N0} € · {vehicle.Make} {vehicle.Model}",
            $"{actor} {verb} un cost de {cost.Amount:N0} € la categoria {cost.Category} " +
            $"pentru {vehicle.Make} {vehicle.Model} ({vehicle.Year}){description}.",
            $"/vehicles/{vehicle.VehicleId}",
            excludeUserId: _tenant.UserId);
    }
}
