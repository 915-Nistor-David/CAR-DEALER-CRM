using CarFlow.API.Data;
using CarFlow.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CarFlow.API.Common;

// Mutarea unei masini intre etape se face DOAR de aici — altfel se pierde
// cate ceva de fiecare data: intrarea in istoric, resetarea markerului de
// reminder sau notificarea catre admin si rolul etapei destinatie.
public interface IVehicleStageService
{
    // Nu apeleaza SaveChangesAsync; apelantul decide cand comite.
    Task MoveAsync(Vehicle vehicle, PipelineStage toStage, string? note);

    // Notificarile se trimit dupa commit, ca sa nu anunte o mutare care a esuat.
    Task NotifyMovedAsync(Vehicle vehicle, PipelineStage toStage, string? note);
}

public class VehicleStageService : IVehicleStageService
{
    private readonly AppDbContext _db;
    private readonly ITenantProvider _tenant;
    private readonly INotificationService _notifications;

    public VehicleStageService(AppDbContext db, ITenantProvider tenant, INotificationService notifications)
    {
        _db = db;
        _tenant = tenant;
        _notifications = notifications;
    }

    public Task MoveAsync(Vehicle vehicle, PipelineStage toStage, string? note)
    {
        _db.VehicleStatusHistory.Add(new VehicleStatusHistory
        {
            VehicleId = vehicle.VehicleId,
            FromStageId = vehicle.CurrentStageId,
            ToStageId = toStage.StageId,
            UserId = _tenant.UserId,
            Note = note
        });

        vehicle.CurrentStageId = toStage.StageId;
        // Masina a intrat intr-o etapa noua — cronometrul de "sta prea mult" o ia de la zero.
        vehicle.StuckReminderSentAt = null;

        return Task.CompletedTask;
    }

    public async Task NotifyMovedAsync(Vehicle vehicle, PipelineStage toStage, string? note)
    {
        var moverName = await _db.Users
            .Where(u => u.UserId == _tenant.UserId)
            .Select(u => u.Name)
            .FirstOrDefaultAsync() ?? "Cineva";

        var roles = new List<string> { "Owner" };
        if (!string.IsNullOrEmpty(toStage.NotifyRole))
            roles.Add(toStage.NotifyRole);

        var message = $"{moverName} a mutat {vehicle.Make} {vehicle.Model} ({vehicle.Year}) în etapa „{toStage.Name}”.";
        if (!string.IsNullOrWhiteSpace(note))
            message += $" Mesaj: „{note}”";

        await _notifications.NotifyRolesAsync(_tenant.DealershipId, roles, NotificationTypes.StageMove,
            $"{vehicle.Make} {vehicle.Model} → {toStage.Name}", message,
            $"/vehicles/{vehicle.VehicleId}", excludeUserId: _tenant.UserId);
    }
}
