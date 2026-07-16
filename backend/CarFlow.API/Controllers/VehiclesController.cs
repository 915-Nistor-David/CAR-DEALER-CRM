using CarFlow.API.Common;
using CarFlow.API.Data;
using CarFlow.API.Models;
using CarFlow.API.Vehicles;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarFlow.API.Controllers;

[ApiController]
[Route("api/vehicles")]
[Authorize]
public class VehiclesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantProvider _tenant;
    private readonly IFileStorage _storage;

    public VehiclesController(AppDbContext db, ITenantProvider tenant, IFileStorage storage)
    {
        _db = db;
        _tenant = tenant;
        _storage = storage;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var vehicles = await _db.Vehicles
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => new VehicleDto
            {
                VehicleId = v.VehicleId,
                Vin = v.Vin,
                Make = v.Make,
                Model = v.Model,
                Year = v.Year,
                Km = v.Km,
                PurchasePrice = v.PurchasePrice,
                AcquisitionSource = v.AcquisitionSource,
                Description = v.Description,
                CurrentStageId = v.CurrentStageId,
                CurrentStageName = v.CurrentStage!.Name,
                CreatedAt = v.CreatedAt,
                MainPhotoUrl = v.Photos.OrderBy(p => p.SortOrder).ThenBy(p => p.PhotoId)
                    .Select(p => p.FilePath).FirstOrDefault(),
                TotalCosts = v.Costs.Sum(c => (decimal?)c.Amount) ?? 0,
                IsSold = v.Sale != null,
                EnteredStageAt = v.History
                    .Where(h => h.ToStageId == v.CurrentStageId)
                    .Max(h => (DateTime?)h.Timestamp) ?? v.CreatedAt
            })
            .ToListAsync();

        foreach (var v in vehicles)
            v.DaysInStage = Math.Max(0, (int)(DateTime.UtcNow - v.EnteredStageAt).TotalDays);

        return Ok(vehicles);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var v = await _db.Vehicles
            .Include(x => x.CurrentStage)
            .Include(x => x.Photos)
            .Include(x => x.Costs)
            .Include(x => x.Sale)
            .FirstOrDefaultAsync(x => x.VehicleId == id);

        if (v == null) return NotFound();

        var history = await _db.VehicleStatusHistory
            .Where(h => h.VehicleId == id)
            .OrderByDescending(h => h.Timestamp)
            .Select(h => new HistoryEntryDto
            {
                HistoryId = h.HistoryId,
                FromStageName = _db.PipelineStages.Where(s => s.StageId == h.FromStageId)
                    .Select(s => s.Name).FirstOrDefault(),
                ToStageName = _db.PipelineStages.Where(s => s.StageId == h.ToStageId)
                    .Select(s => s.Name).FirstOrDefault() ?? "",
                UserName = _db.Users.Where(u => u.UserId == h.UserId)
                    .Select(u => u.Name).FirstOrDefault() ?? "",
                Timestamp = h.Timestamp,
                Note = h.Note
            })
            .ToListAsync();

        var totalCosts = v.Costs.Sum(c => c.Amount);
        var enteredStageAt = await _db.VehicleStatusHistory
            .Where(h => h.VehicleId == id && h.ToStageId == v.CurrentStageId)
            .MaxAsync(h => (DateTime?)h.Timestamp) ?? v.CreatedAt;

        var dto = new VehicleDetailDto
        {
            VehicleId = v.VehicleId,
            Vin = v.Vin,
            Make = v.Make,
            Model = v.Model,
            Year = v.Year,
            Km = v.Km,
            PurchasePrice = v.PurchasePrice,
            AcquisitionSource = v.AcquisitionSource,
            Description = v.Description,
            CurrentStageId = v.CurrentStageId,
            CurrentStageName = v.CurrentStage?.Name ?? "",
            CreatedAt = v.CreatedAt,
            MainPhotoUrl = v.Photos.OrderBy(p => p.SortOrder).ThenBy(p => p.PhotoId)
                .Select(p => p.FilePath).FirstOrDefault(),
            TotalCosts = totalCosts,
            IsSold = v.Sale != null,
            EnteredStageAt = enteredStageAt,
            DaysInStage = Math.Max(0, (int)(DateTime.UtcNow - enteredStageAt).TotalDays),
            Photos = v.Photos.OrderBy(p => p.SortOrder).ThenBy(p => p.PhotoId)
                .Select(p => new PhotoDto
                {
                    PhotoId = p.PhotoId,
                    Url = p.FilePath,
                    Category = p.Category,
                    SortOrder = p.SortOrder
                }).ToList(),
            Costs = v.Costs.OrderByDescending(c => c.Date).ThenByDescending(c => c.CostId)
                .Select(c => new CostDto
                {
                    CostId = c.CostId,
                    Category = c.Category,
                    Amount = c.Amount,
                    Date = c.Date,
                    Description = c.Description
                }).ToList(),
            History = history,
            Sale = v.Sale == null ? null : new SaleInfoDto
            {
                SaleId = v.Sale.SaleId,
                SalePrice = v.Sale.SalePrice,
                SaleDate = v.Sale.SaleDate,
                Type = v.Sale.Type,
                FinancingPartner = v.Sale.FinancingPartner,
                FinancingTerms = v.Sale.FinancingTerms,
                BuyerName = v.Sale.BuyerName,
                BuyerPhone = v.Sale.BuyerPhone,
                DocsHandedOver = v.Sale.DocsHandedOver,
                PlatesDone = v.Sale.PlatesDone,
                WarrantyGiven = v.Sale.WarrantyGiven
            },
            Profit = v.Sale == null ? null : v.Sale.SalePrice - v.PurchasePrice - totalCosts
        };

        return Ok(dto);
    }

    [HttpPost]
    public async Task<IActionResult> Create(SaveVehicleRequest req)
    {
        var firstStage = await _db.PipelineStages.OrderBy(s => s.SortOrder).FirstOrDefaultAsync();
        if (firstStage == null)
            return BadRequest(new { message = "Dealerul nu are etape de pipeline configurate." });

        var vehicle = new Vehicle
        {
            Vin = req.Vin,
            Make = req.Make,
            Model = req.Model,
            Year = req.Year,
            Km = req.Km,
            PurchasePrice = req.PurchasePrice,
            AcquisitionSource = req.AcquisitionSource,
            Description = req.Description,
            CurrentStageId = firstStage.StageId
        };
        _db.Vehicles.Add(vehicle);
        await _db.SaveChangesAsync();

        _db.VehicleStatusHistory.Add(new VehicleStatusHistory
        {
            VehicleId = vehicle.VehicleId,
            FromStageId = null,
            ToStageId = firstStage.StageId,
            UserId = _tenant.UserId,
            Note = "Mașină adăugată în stoc"
        });
        await _db.SaveChangesAsync();

        return Ok(new { vehicleId = vehicle.VehicleId });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, SaveVehicleRequest req)
    {
        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.VehicleId == id);
        if (vehicle == null) return NotFound();

        vehicle.Vin = req.Vin;
        vehicle.Make = req.Make;
        vehicle.Model = req.Model;
        vehicle.Year = req.Year;
        vehicle.Km = req.Km;
        vehicle.PurchasePrice = req.PurchasePrice;
        vehicle.AcquisitionSource = req.AcquisitionSource;
        vehicle.Description = req.Description;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Mașina a fost actualizată." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var vehicle = await _db.Vehicles
            .Include(v => v.Photos)
            .Include(v => v.Sale)
            .FirstOrDefaultAsync(v => v.VehicleId == id);
        if (vehicle == null) return NotFound();

        if (vehicle.Sale != null)
            return BadRequest(new { message = "O mașină vândută nu poate fi ștearsă (istoric financiar)." });

        foreach (var photo in vehicle.Photos)
            _storage.Delete(photo.FilePath);

        _db.Vehicles.Remove(vehicle);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Mașina a fost ștearsă." });
    }

    // Mutarea intr-o alta etapa — scrie intotdeauna o intrare in istoric.
    [HttpPut("{id}/stage")]
    public async Task<IActionResult> ChangeStage(int id, ChangeStageRequest req)
    {
        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.VehicleId == id);
        if (vehicle == null) return NotFound();

        var stageExists = await _db.PipelineStages.AnyAsync(s => s.StageId == req.StageId);
        if (!stageExists)
            return BadRequest(new { message = "Etapa nu există." });

        if (vehicle.CurrentStageId == req.StageId)
            return Ok(new { message = "Mașina este deja în această etapă." });

        _db.VehicleStatusHistory.Add(new VehicleStatusHistory
        {
            VehicleId = vehicle.VehicleId,
            FromStageId = vehicle.CurrentStageId,
            ToStageId = req.StageId,
            UserId = _tenant.UserId,
            Note = req.Note
        });
        vehicle.CurrentStageId = req.StageId;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Etapa a fost schimbată." });
    }
}
