using CarFlow.API.Common;
using CarFlow.API.Data;
using CarFlow.API.Models;
using CarFlow.API.Sales;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarFlow.API.Controllers;

[ApiController]
[Authorize]
public class SalesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantProvider _tenant;

    public SalesController(AppDbContext db, ITenantProvider tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    // Inregistreaza vanzarea si muta masina in etapa "Vândută" (daca exista).
    [HttpPost("api/vehicles/{vehicleId}/sale")]
    public async Task<IActionResult> Create(int vehicleId, CreateSaleRequest req)
    {
        if (req.Type != "Cash" && req.Type != "Finantat")
            return BadRequest(new { message = "Tipul vânzării trebuie să fie Cash sau Finantat." });
        if (req.Type == "Finantat" && string.IsNullOrWhiteSpace(req.FinancingPartner))
            return BadRequest(new { message = "Partenerul de finanțare este obligatoriu pentru vânzările finanțate." });

        var vehicle = await _db.Vehicles
            .Include(v => v.Sale)
            .FirstOrDefaultAsync(v => v.VehicleId == vehicleId);
        if (vehicle == null) return NotFound();
        if (vehicle.Sale != null)
            return BadRequest(new { message = "Mașina este deja vândută." });

        var sale = new Sale
        {
            VehicleId = vehicleId,
            SalePrice = req.SalePrice,
            SaleDate = req.SaleDate,
            Type = req.Type,
            FinancingPartner = req.Type == "Finantat" ? req.FinancingPartner : null,
            FinancingTerms = req.Type == "Finantat" ? req.FinancingTerms : null,
            BuyerName = req.BuyerName,
            BuyerPhone = req.BuyerPhone
        };
        _db.Sales.Add(sale);

        var soldStage = await _db.PipelineStages.FirstOrDefaultAsync(s => s.Name == "Vândută");
        if (soldStage != null && vehicle.CurrentStageId != soldStage.StageId)
        {
            _db.VehicleStatusHistory.Add(new VehicleStatusHistory
            {
                VehicleId = vehicleId,
                FromStageId = vehicle.CurrentStageId,
                ToStageId = soldStage.StageId,
                UserId = _tenant.UserId,
                Note = $"Vânzare înregistrată ({req.Type})"
            });
            vehicle.CurrentStageId = soldStage.StageId;
        }

        await _db.SaveChangesAsync();
        return Ok(new { saleId = sale.SaleId });
    }

    [HttpGet("api/sales")]
    public async Task<IActionResult> GetAll()
    {
        var sales = await _db.Sales
            .OrderByDescending(s => s.SaleDate)
            .ThenByDescending(s => s.SaleId)
            .Select(s => new SaleListDto
            {
                SaleId = s.SaleId,
                VehicleId = s.VehicleId,
                VehicleName = _db.Vehicles.Where(v => v.VehicleId == s.VehicleId)
                    .Select(v => v.Make + " " + v.Model + " (" + v.Year + ")")
                    .FirstOrDefault() ?? "",
                PurchasePrice = _db.Vehicles.Where(v => v.VehicleId == s.VehicleId)
                    .Select(v => v.PurchasePrice).FirstOrDefault(),
                TotalCosts = _db.VehicleCosts.Where(c => c.VehicleId == s.VehicleId)
                    .Sum(c => (decimal?)c.Amount) ?? 0,
                SalePrice = s.SalePrice,
                SaleDate = s.SaleDate,
                Type = s.Type,
                FinancingPartner = s.FinancingPartner,
                BuyerName = s.BuyerName,
                BuyerPhone = s.BuyerPhone,
                DocsHandedOver = s.DocsHandedOver,
                PlatesDone = s.PlatesDone,
                WarrantyGiven = s.WarrantyGiven
            })
            .ToListAsync();

        foreach (var s in sales)
            s.Profit = s.SalePrice - s.PurchasePrice - s.TotalCosts;

        return Ok(sales);
    }

    [HttpPut("api/sales/{id}/checklist")]
    public async Task<IActionResult> UpdateChecklist(int id, UpdateChecklistRequest req)
    {
        var sale = await _db.Sales.FirstOrDefaultAsync(s => s.SaleId == id);
        if (sale == null) return NotFound();

        sale.DocsHandedOver = req.DocsHandedOver;
        sale.PlatesDone = req.PlatesDone;
        sale.WarrantyGiven = req.WarrantyGiven;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Checklist actualizat." });
    }
}
