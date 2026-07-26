using CarFlow.API.Common;
using CarFlow.API.Data;
using CarFlow.API.Documents;
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
    private readonly IVehicleStageService _stages;
    private readonly IPhotoUrlSigner _photoUrls;

    public VehiclesController(AppDbContext db, ITenantProvider tenant, IFileStorage storage,
        IVehicleStageService stages, IPhotoUrlSigner photoUrls)
    {
        _db = db;
        _tenant = tenant;
        _storage = storage;
        _stages = stages;
        _photoUrls = photoUrls;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        // Pretul de achizitie e confidential — doar Ownerul il vede.
        var isOwner = User.IsInRole("Owner");

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
                PurchasePrice = isOwner ? v.PurchasePrice : (decimal?)null,
                RARDate = v.RARDate,
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

        // Ultima mutare per masina, intr-o singura interogare: randul de istoric
        // dupa care nu mai exista altul mai nou (greatest-n-per-group prin NOT EXISTS).
        var lastMoves = await (
            from h in _db.VehicleStatusHistory
            where !_db.VehicleStatusHistory.Any(h2 => h2.VehicleId == h.VehicleId &&
                (h2.Timestamp > h.Timestamp || (h2.Timestamp == h.Timestamp && h2.HistoryId > h.HistoryId)))
            select new
            {
                h.VehicleId,
                h.Timestamp,
                UserName = _db.Users.Where(u => u.UserId == h.UserId).Select(u => u.Name).FirstOrDefault()
            }).ToDictionaryAsync(x => x.VehicleId);

        foreach (var v in vehicles)
        {
            v.DaysInStage = Math.Max(0, (int)(DateTime.UtcNow - v.EnteredStageAt).TotalDays);
            v.MainPhotoUrl = _photoUrls.Sign(v.MainPhotoUrl);
            if (lastMoves.TryGetValue(v.VehicleId, out var move))
            {
                v.LastMovedBy = move.UserName;
                v.LastMovedAt = move.Timestamp;
            }
        }

        return Ok(vehicles);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var isOwner = User.IsInRole("Owner");
        var canSeeSale = isOwner || User.IsInRole("Vanzari");

        var v = await _db.Vehicles
            .Include(x => x.CurrentStage)
            .Include(x => x.Photos)
            .Include(x => x.Costs)
            .Include(x => x.Sale)
            .FirstOrDefaultAsync(x => x.VehicleId == id);

        if (v == null) return NotFound();

        var history = await _db.VehicleStatusHistory
            .Where(h => h.VehicleId == id)
            // HistoryId ca departajare: prima intrare din lista e si "ultima mutare",
            // deci ordinea trebuie sa fie fara ambiguitate la timestamp-uri egale.
            .OrderByDescending(h => h.Timestamp).ThenByDescending(h => h.HistoryId)
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

        var documents = await _db.VehicleDocuments
            .Where(d => d.VehicleId == id)
            .OrderBy(d => d.IsDone).ThenBy(d => d.DueDate).ThenBy(d => d.DocumentId)
            .Select(d => new DocumentDto
            {
                DocumentId = d.DocumentId,
                Name = d.Name,
                IsDone = d.IsDone,
                DueDate = d.DueDate,
                CreatedAt = d.CreatedAt
            })
            .ToListAsync();

        // Autorii costurilor. Users nu are filtru global de tenant (login-ul cauta
        // dupa email in tot tabelul), deci filtram explicit pe dealership.
        var costAuthorIds = v.Costs.Where(c => c.CreatedByUserId != null)
            .Select(c => c.CreatedByUserId!.Value).Distinct().ToList();
        var costAuthors = costAuthorIds.Count == 0
            ? new Dictionary<int, string>()
            : await _db.Users
                .Where(u => costAuthorIds.Contains(u.UserId) && u.DealershipId == _tenant.DealershipId)
                .ToDictionaryAsync(u => u.UserId, u => u.Name);

        string? AuthorName(int? userId) =>
            userId != null && costAuthors.TryGetValue(userId.Value, out var name) ? name : null;

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
            PurchasePrice = isOwner ? v.PurchasePrice : null,
            RARDate = v.RARDate,
            AcquisitionSource = v.AcquisitionSource,
            Description = v.Description,
            CurrentStageId = v.CurrentStageId,
            CurrentStageName = v.CurrentStage?.Name ?? "",
            CreatedAt = v.CreatedAt,
            MainPhotoUrl = _photoUrls.Sign(v.Photos.OrderBy(p => p.SortOrder).ThenBy(p => p.PhotoId)
                .Select(p => p.FilePath).FirstOrDefault()),
            TotalCosts = totalCosts,
            IsSold = v.Sale != null,
            EnteredStageAt = enteredStageAt,
            DaysInStage = Math.Max(0, (int)(DateTime.UtcNow - enteredStageAt).TotalDays),
            // Istoricul e deja sortat descrescator, deci prima intrare e ultima mutare.
            LastMovedBy = history.FirstOrDefault()?.UserName,
            LastMovedAt = history.FirstOrDefault()?.Timestamp,
            Photos = v.Photos.OrderBy(p => p.SortOrder).ThenBy(p => p.PhotoId)
                .Select(p => new PhotoDto
                {
                    PhotoId = p.PhotoId,
                    Url = _photoUrls.Sign(p.FilePath)!,
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
                    Description = c.Description,
                    CreatedByName = AuthorName(c.CreatedByUserId),
                    CanDelete = isOwner || c.CreatedByUserId == _tenant.UserId
                }).ToList(),
            History = history,
            Documents = documents,
            // Datele comerciale (pret vanzare, cumparator, finantare) sunt vizibile
            // doar cui are acces si la /api/sales — juniorii vad doar ca e vanduta.
            Sale = v.Sale == null || !canSeeSale ? null : new SaleInfoDto
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
            Profit = !isOwner || v.Sale == null ? null : v.Sale.SalePrice - v.PurchasePrice - totalCosts
        };

        return Ok(dto);
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Vanzari")]
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
            RARDate = req.RARDate,
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
    [Authorize(Roles = "Owner,Vanzari")]
    public async Task<IActionResult> Update(int id, SaveVehicleRequest req)
    {
        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.VehicleId == id);
        if (vehicle == null) return NotFound();

        vehicle.Vin = req.Vin;
        vehicle.Make = req.Make;
        vehicle.Model = req.Model;
        vehicle.Year = req.Year;
        vehicle.Km = req.Km;
        // Non-Owner nu vede pretul de achizitie, deci nici nu-l poate suprascrie
        if (User.IsInRole("Owner"))
            vehicle.PurchasePrice = req.PurchasePrice;
        vehicle.AcquisitionSource = req.AcquisitionSource;
        vehicle.Description = req.Description;

        // Daca data RAR se schimba, reminderul trimis nu mai e valabil — se va retrimite
        if (vehicle.RARDate != req.RARDate)
            vehicle.RARReminderSentFor = null;
        vehicle.RARDate = req.RARDate;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Mașina a fost actualizată." });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Owner")]
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

    // Mutarea intr-o alta etapa — doar Owner si Vanzari. Juniorii raporteaza
    // progresul altfel: la interviu s-a cerut sa poata muta ei masina, dar in
    // practica un junior putea sa o duca direct in "Vanduta", ceea ce nu are sens.
    [HttpPut("{id}/stage")]
    [Authorize(Roles = "Owner,Vanzari")]
    public async Task<IActionResult> ChangeStage(int id, ChangeStageRequest req)
    {
        var vehicle = await _db.Vehicles
            .Include(v => v.Sale)
            .FirstOrDefaultAsync(v => v.VehicleId == id);
        if (vehicle == null) return NotFound();

        // O masina vanduta nu se mai plimba prin pipeline — vanzarea ramane inregistrata.
        if (vehicle.Sale != null)
            return BadRequest(new { message = "Mașina este vândută și nu mai poate fi mutată între etape." });

        var stage = await _db.PipelineStages.FirstOrDefaultAsync(s => s.StageId == req.StageId);
        if (stage == null)
            return BadRequest(new { message = "Etapa nu există." });

        // In etapa de vanzare se intra DOAR inregistrand vanzarea. Altfel ramanea
        // o masina care arata vanduta dar nu are pret, cumparator sau profit,
        // nu apare in /sales si nici macar nu primeste eticheta "Vanduta"
        // (IsSold se calculeaza din existenta vanzarii, nu din etapa).
        if (stage.IsSoldStage)
            return BadRequest(new
            {
                message = "În această etapă se ajunge doar înregistrând vânzarea (butonul „Marchează ca vândută”)."
            });

        if (vehicle.CurrentStageId == req.StageId)
            return Ok(new { message = "Mașina este deja în această etapă." });

        await _stages.MoveAsync(vehicle, stage, req.Note);
        await _db.SaveChangesAsync();
        await _stages.NotifyMovedAsync(vehicle, stage, req.Note);

        return Ok(new { message = "Etapa a fost schimbată." });
    }
}
