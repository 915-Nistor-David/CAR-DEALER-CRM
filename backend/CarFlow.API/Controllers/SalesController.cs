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
    private readonly IVehicleStageService _stages;

    public SalesController(AppDbContext db, ITenantProvider tenant, IVehicleStageService stages)
    {
        _db = db;
        _tenant = tenant;
        _stages = stages;
    }

    // Inregistreaza vanzarea si muta masina in etapa "Vândută" (daca exista).
    [HttpPost("api/vehicles/{vehicleId}/sale")]
    [Authorize(Roles = "Owner,Vanzari")]
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

        // Etapa de "vanduta" e marcata cu un flag, nu cautata dupa nume — altfel
        // o redenumire din /etape ar rupe mutarea in tacere.
        var soldStage = await _db.PipelineStages.FirstOrDefaultAsync(s => s.IsSoldStage);
        if (soldStage == null)
            return BadRequest(new
            {
                message = "Nicio etapă nu este marcată ca „vândută”. Bifează opțiunea la etapa potrivită în pagina Etape."
            });

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

        var note = $"Vânzare înregistrată ({req.Type})";
        var moved = vehicle.CurrentStageId != soldStage.StageId;
        if (moved)
            await _stages.MoveAsync(vehicle, soldStage, note);

        await _db.SaveChangesAsync();

        if (moved)
            await _stages.NotifyMovedAsync(vehicle, soldStage, note);

        return Ok(new { saleId = sale.SaleId });
    }

    [HttpGet("api/sales")]
    [Authorize(Roles = "Owner,Vanzari")]
    public async Task<IActionResult> GetAll()
    {
        var isOwner = User.IsInRole("Owner");

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
        {
            if (isOwner)
            {
                s.Profit = s.SalePrice - s.PurchasePrice - s.TotalCosts;
            }
            else
            {
                s.PurchasePrice = null;
                s.Profit = null;
            }
        }

        return Ok(sales);
    }

    [HttpPut("api/sales/{id}/checklist")]
    [Authorize(Roles = "Owner,Vanzari")]
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
