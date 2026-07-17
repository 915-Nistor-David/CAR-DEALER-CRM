using CarFlow.API.Common;
using CarFlow.API.Data;
using Microsoft.EntityFrameworkCore;

namespace CarFlow.API.Services;

// Ruleaza o trecere la pornire (dupa migrari) si apoi la fiecare 30 de minute.
// Toate query-urile folosesc IgnoreQueryFilters — aici nu exista HttpContext/tenant,
// asa ca parcurgem toate dealership-urile si transmitem DealershipId explicit.
public class ReminderBackgroundService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(30);
    private const int ReminderWindowDays = 3; // cu cate zile inainte anuntam RAR/termene acte

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ReminderBackgroundService> _logger;

    public ReminderBackgroundService(IServiceScopeFactory scopeFactory,
        ILogger<ReminderBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunPassAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la trecerea de remindere");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }

    private async Task RunPassAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(DateTime.Now);

        var settings = await db.Dealerships.AsNoTracking()
            .Select(d => new { d.DealershipId, d.DefaultStageAlertDays, d.StockAlertDays })
            .ToDictionaryAsync(d => d.DealershipId, ct);

        // ===== 1. RAR in urmatoarele zile =====
        var rarLimit = today.AddDays(ReminderWindowDays);
        var rarVehicles = await db.Vehicles.IgnoreQueryFilters()
            .Where(v => v.RARDate != null && v.RARDate >= today && v.RARDate <= rarLimit
                        && v.RARReminderSentFor != v.RARDate)
            .ToListAsync(ct);

        foreach (var v in rarVehicles)
        {
            await notifications.NotifyRolesAsync(v.DealershipId, new[] { "Owner", "Junior" }, "RAR",
                $"RAR: {v.Make} {v.Model}",
                $"{v.Make} {v.Model} ({v.Year}) are programare RAR pe {v.RARDate:dd.MM.yyyy}.",
                $"/vehicles/{v.VehicleId}");
            v.RARReminderSentFor = v.RARDate;
        }

        // ===== 2. Acte nebifate cu termen apropiat (sau depasit) =====
        var docLimit = today.AddDays(ReminderWindowDays);
        var dueDocs = await db.VehicleDocuments.IgnoreQueryFilters()
            .Where(d => !d.IsDone && !d.ReminderSent && d.DueDate != null && d.DueDate <= docLimit)
            .ToListAsync(ct);

        if (dueDocs.Count > 0)
        {
            var vehicleIds = dueDocs.Select(d => d.VehicleId).Distinct().ToList();
            var vehicleNames = await db.Vehicles.IgnoreQueryFilters()
                .Where(v => vehicleIds.Contains(v.VehicleId))
                .ToDictionaryAsync(v => v.VehicleId, v => $"{v.Make} {v.Model} ({v.Year})", ct);

            foreach (var d in dueDocs)
            {
                var vehicleName = vehicleNames.GetValueOrDefault(d.VehicleId, "mașină necunoscută");
                await notifications.NotifyRolesAsync(d.DealershipId, new[] { "Owner" }, "Document",
                    $"Act de rezolvat: {d.Name}",
                    $"Actul „{d.Name}” pentru {vehicleName} are termen {d.DueDate:dd.MM.yyyy}.",
                    $"/vehicles/{d.VehicleId}");
                d.ReminderSent = true;
            }
        }

        // ===== 3. Sta prea mult in etapa curenta (masini nevandute) =====
        var stuckCandidates = await db.Vehicles.IgnoreQueryFilters()
            .Where(v => v.Sale == null && v.StuckReminderSentAt == null)
            .Select(v => new
            {
                Vehicle = v,
                StageName = v.CurrentStage!.Name,
                StageAlertDays = v.CurrentStage.AlertDays,
                StageNotifyRole = v.CurrentStage.NotifyRole,
                EnteredStageAt = v.History
                    .Where(h => h.ToStageId == v.CurrentStageId)
                    .Max(h => (DateTime?)h.Timestamp) ?? v.CreatedAt
            })
            .ToListAsync(ct);

        foreach (var c in stuckCandidates)
        {
            if (!settings.TryGetValue(c.Vehicle.DealershipId, out var cfg)) continue;

            var threshold = c.StageAlertDays ?? cfg.DefaultStageAlertDays;
            var days = (int)(now - c.EnteredStageAt).TotalDays;
            if (days < threshold) continue;

            var roles = new List<string> { "Owner" };
            if (!string.IsNullOrEmpty(c.StageNotifyRole))
                roles.Add(c.StageNotifyRole);

            await notifications.NotifyRolesAsync(c.Vehicle.DealershipId, roles, "StuckInStage",
                $"{c.Vehicle.Make} {c.Vehicle.Model} stă de {days} zile în {c.StageName}",
                $"{c.Vehicle.Make} {c.Vehicle.Model} ({c.Vehicle.Year}) este de {days} zile în etapa „{c.StageName}” (prag: {threshold} zile).",
                $"/vehicles/{c.Vehicle.VehicleId}");
            c.Vehicle.StuckReminderSentAt = now;
        }

        // ===== 4. Prea veche in stoc (nevanduta) =====
        var agingCandidates = await db.Vehicles.IgnoreQueryFilters()
            .Where(v => v.Sale == null && v.StockAgingReminderSentAt == null)
            .ToListAsync(ct);

        foreach (var v in agingCandidates)
        {
            if (!settings.TryGetValue(v.DealershipId, out var cfg)) continue;

            var days = (int)(now - v.CreatedAt).TotalDays;
            if (days < cfg.StockAlertDays) continue;

            await notifications.NotifyRolesAsync(v.DealershipId, new[] { "Owner", "Vanzari" }, "StockAging",
                $"{v.Make} {v.Model} este de {days} zile în stoc",
                $"{v.Make} {v.Model} ({v.Year}) este nevândută de {days} zile (prag: {cfg.StockAlertDays} zile). Poate merită o repoziționare de preț sau promovare.",
                $"/vehicles/{v.VehicleId}");
            v.StockAgingReminderSentAt = now;
        }

        // Salveaza markerii de deduplicare ramasi (notificarile se salveaza in NotifyRolesAsync)
        await db.SaveChangesAsync(ct);
    }
}
