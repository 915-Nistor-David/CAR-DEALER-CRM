using CarFlow.API.Common;
using CarFlow.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarFlow.API.Controllers;

public class AgendaEntryDto
{
    // RAR | Document | StuckInStage | StockAging — aceleasi denumiri ca la notificari
    public string Kind { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public int VehicleId { get; set; }
    public string VehicleName { get; set; } = string.Empty;
    public bool IsOverdue { get; set; }
}

// Toate lucrurile cu termen, intr-un singur loc. Nu exista (inca) sarcini
// atribuibile — agenda aduna datele cu scadenta care exista deja in sistem.
// Fiecare rol vede exact ce ar fi si notificat, ca sa nu apara pe calendar
// lucruri despre care nu afla oricum.
[ApiController]
[Route("api/agenda")]
[Authorize]
public class AgendaController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantProvider _tenant;

    public AgendaController(AppDbContext db, ITenantProvider tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var fromDate = from ?? today.AddDays(-30);
        var toDate = to ?? today.AddDays(60);
        if (toDate < fromDate) return BadRequest(new { message = "Interval invalid." });

        var isOwner = User.IsInRole("Owner");
        var isJunior = User.IsInRole("Junior");
        var isSales = User.IsInRole("Vanzari");

        var settings = await _db.Dealerships
            .Where(d => d.DealershipId == _tenant.DealershipId)
            .Select(d => new { d.DefaultStageAlertDays, d.StockAlertDays })
            .FirstOrDefaultAsync();
        if (settings == null) return NotFound();

        var entries = new List<AgendaEntryDto>();

        // ===== RAR (Owner + Junior, la fel ca notificarea) =====
        if (isOwner || isJunior)
        {
            var rar = await _db.Vehicles
                .Where(v => v.RARDate != null && v.RARDate >= fromDate && v.RARDate <= toDate)
                .Select(v => new { v.VehicleId, v.Make, v.Model, v.Year, v.RARDate })
                .ToListAsync();

            entries.AddRange(rar.Select(v => new AgendaEntryDto
            {
                Kind = NotificationTypes.RAR,
                Date = v.RARDate!.Value,
                Title = "Programare RAR",
                VehicleId = v.VehicleId,
                VehicleName = $"{v.Make} {v.Model} ({v.Year})",
                IsOverdue = v.RARDate!.Value < today
            }));
        }

        // ===== Acte nebifate cu termen (Owner) =====
        if (isOwner)
        {
            var docs = await _db.VehicleDocuments
                .Where(d => !d.IsDone && d.DueDate != null && d.DueDate >= fromDate && d.DueDate <= toDate)
                .Join(_db.Vehicles, d => d.VehicleId, v => v.VehicleId, (d, v) => new
                {
                    d.DocumentId, d.Name, d.DueDate, v.VehicleId, v.Make, v.Model, v.Year
                })
                .ToListAsync();

            entries.AddRange(docs.Select(d => new AgendaEntryDto
            {
                Kind = NotificationTypes.Document,
                Date = d.DueDate!.Value,
                Title = $"Act: {d.Name}",
                VehicleId = d.VehicleId,
                VehicleName = $"{d.Make} {d.Model} ({d.Year})",
                IsOverdue = d.DueDate!.Value < today
            }));
        }

        // ===== Masini care depasesc pragul etapei =====
        // Ziua afisata e cea in care masina devine "blocata", nu ziua intrarii in etapa.
        var active = await _db.Vehicles
            .Where(v => v.Sale == null)
            .Select(v => new
            {
                v.VehicleId, v.Make, v.Model, v.Year, v.CreatedAt,
                StageName = v.CurrentStage!.Name,
                StageAlertDays = v.CurrentStage.AlertDays,
                StageNotifyRole = v.CurrentStage.NotifyRole,
                EnteredStageAt = v.History
                    .Where(h => h.ToStageId == v.CurrentStageId)
                    .Max(h => (DateTime?)h.Timestamp) ?? v.CreatedAt
            })
            .ToListAsync();

        foreach (var v in active)
        {
            // Acelasi destinatar ca notificarea de blocaj: Owner + rolul etapei.
            var visible = isOwner
                || (isJunior && v.StageNotifyRole == "Junior")
                || (isSales && v.StageNotifyRole == "Vanzari");
            if (!visible) continue;

            var dueDate = AlertRules.StuckDueDate(v.EnteredStageAt, v.StageAlertDays, settings.DefaultStageAlertDays);
            if (dueDate < fromDate || dueDate > toDate) continue;

            var threshold = v.StageAlertDays ?? settings.DefaultStageAlertDays;
            entries.Add(new AgendaEntryDto
            {
                Kind = NotificationTypes.StuckInStage,
                Date = dueDate,
                Title = $"Prea mult în „{v.StageName}”",
                Detail = $"prag {threshold} zile",
                VehicleId = v.VehicleId,
                VehicleName = $"{v.Make} {v.Model} ({v.Year})",
                IsOverdue = dueDate < today
            });
        }

        // ===== Masini prea vechi in stoc (Owner + Vanzari) =====
        if (isOwner || isSales)
        {
            foreach (var v in active)
            {
                var dueDate = AlertRules.StockAgingDueDate(v.CreatedAt, settings.StockAlertDays);
                if (dueDate < fromDate || dueDate > toDate) continue;

                entries.Add(new AgendaEntryDto
                {
                    Kind = NotificationTypes.StockAging,
                    Date = dueDate,
                    Title = "Prea mult în stoc",
                    Detail = $"prag {settings.StockAlertDays} zile",
                    VehicleId = v.VehicleId,
                    VehicleName = $"{v.Make} {v.Model} ({v.Year})",
                    IsOverdue = dueDate < today
                });
            }
        }

        var ordered = entries
            .OrderBy(e => e.Date)
            .ThenBy(e => e.VehicleName)
            .ToList();

        return Ok(new { from = fromDate, to = toDate, today, entries = ordered });
    }
}
