using System.ComponentModel.DataAnnotations;
using CarFlow.API.Common;
using CarFlow.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarFlow.API.Controllers;

public class SettingsDto
{
    [Range(1, 365)]
    public int DefaultStageAlertDays { get; set; }

    [Range(1, 3650)]
    public int StockAlertDays { get; set; }
}

[ApiController]
[Route("api/settings")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantProvider _tenant;

    public SettingsController(AppDbContext db, ITenantProvider tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var settings = await _db.Dealerships
            .Where(d => d.DealershipId == _tenant.DealershipId)
            .Select(d => new SettingsDto
            {
                DefaultStageAlertDays = d.DefaultStageAlertDays,
                StockAlertDays = d.StockAlertDays
            })
            .FirstOrDefaultAsync();

        if (settings == null) return NotFound();
        return Ok(settings);
    }

    [HttpPut]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Update(SettingsDto req)
    {
        var dealership = await _db.Dealerships
            .FirstOrDefaultAsync(d => d.DealershipId == _tenant.DealershipId);
        if (dealership == null) return NotFound();

        dealership.DefaultStageAlertDays = req.DefaultStageAlertDays;
        dealership.StockAlertDays = req.StockAlertDays;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Setările au fost salvate." });
    }
}
