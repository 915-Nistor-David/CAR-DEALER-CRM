using CarFlow.API.Data;
using CarFlow.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CarFlow.API.Common;

public interface INotificationService
{
    // Creeaza cate o notificare pentru fiecare utilizator ACTIV din rolurile date
    // (fan-out la scriere). dealershipId e explicit ca sa functioneze si din
    // BackgroundService, unde nu exista HttpContext/tenant.
    Task NotifyRolesAsync(int dealershipId, IEnumerable<string> roles, string type,
        string title, string message, string? linkUrl, int? excludeUserId = null);
}

public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;

    public NotificationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task NotifyRolesAsync(int dealershipId, IEnumerable<string> roles, string type,
        string title, string message, string? linkUrl, int? excludeUserId = null)
    {
        var roleList = roles.Distinct().ToList();

        // Users nu are filtru global de tenant, deci filtram explicit pe dealership.
        var userIds = await _db.Users
            .Where(u => u.DealershipId == dealershipId && u.IsActive && roleList.Contains(u.Role))
            .Where(u => excludeUserId == null || u.UserId != excludeUserId)
            .Select(u => u.UserId)
            .ToListAsync();

        foreach (var userId in userIds)
        {
            _db.Notifications.Add(new Notification
            {
                DealershipId = dealershipId,
                UserId = userId,
                Type = type,
                Title = title,
                Message = message,
                LinkUrl = linkUrl
            });
        }

        // Salvam mereu, chiar daca nimeni nu e de notificat: apelantii (ex. serviciul
        // de remindere) seteaza markeri de deduplicare inainte de apel si se bazeaza
        // pe acest commit ca marker + notificari sa ajunga in DB impreuna.
        await _db.SaveChangesAsync();
    }
}
