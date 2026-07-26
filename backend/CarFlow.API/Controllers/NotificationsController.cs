using CarFlow.API.Common;
using CarFlow.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarFlow.API.Controllers;

public class NotificationDto
{
    public int NotificationId { get; set; }
    public string Type { get; set; } = string.Empty;
    // Derivata din Type — clientul nu trebuie sa stie maparea
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? LinkUrl { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private const int DefaultPageSize = 30;
    private const int MaxPageSize = 100;

    private readonly AppDbContext _db;
    private readonly ITenantProvider _tenant;

    public NotificationsController(AppDbContext db, ITenantProvider tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    // Notificarile utilizatorului curent, cu filtrare pe categorie/tip/necitite
    // si paginare. Contoarele per categorie vin mereu pe TOATE notificarile,
    // nu doar pe pagina curenta — asa taburile pot afisa cate necitite au.
    [HttpGet]
    public async Task<IActionResult> GetMine(
        [FromQuery] string? category,
        [FromQuery] string? type,
        [FromQuery] bool unreadOnly = false,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        [FromQuery] int skip = 0,
        [FromQuery] int take = DefaultPageSize)
    {
        if (category != null && !NotificationCategories.IsValid(category))
            return BadRequest(new { message = "Categorie invalidă." });

        take = Math.Clamp(take, 1, MaxPageSize);
        skip = Math.Max(0, skip);

        var mine = _db.Notifications.Where(n => n.UserId == _tenant.UserId);

        var unreadCount = await mine.CountAsync(n => !n.IsRead);
        var unreadByCategory = NotificationCategories.All.ToDictionary(
            c => c,
            c =>
            {
                var types = NotificationCategories.TypesIn(c);
                return mine.Count(n => !n.IsRead && types.Contains(n.Type));
            });

        var filtered = mine;
        if (category != null)
        {
            var types = NotificationCategories.TypesIn(category);
            filtered = filtered.Where(n => types.Contains(n.Type));
        }
        if (!string.IsNullOrEmpty(type))
            filtered = filtered.Where(n => n.Type == type);
        if (unreadOnly)
            filtered = filtered.Where(n => !n.IsRead);
        if (from != null)
        {
            var fromUtc = DateTime.SpecifyKind(from.Value.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            filtered = filtered.Where(n => n.CreatedAt >= fromUtc);
        }
        if (to != null)
        {
            var toUtc = DateTime.SpecifyKind(to.Value.AddDays(1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            filtered = filtered.Where(n => n.CreatedAt < toUtc);
        }

        var total = await filtered.CountAsync();
        var items = await filtered
            .OrderByDescending(n => n.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(n => new NotificationDto
            {
                NotificationId = n.NotificationId,
                Type = n.Type,
                Title = n.Title,
                Message = n.Message,
                LinkUrl = n.LinkUrl,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync();

        // Maparea tip -> categorie e in memorie (dictionar), nu poate rula in SQL.
        foreach (var i in items)
            i.Category = NotificationCategories.For(i.Type);

        return Ok(new { unreadCount, unreadByCategory, total, items });
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.NotificationId == id && n.UserId == _tenant.UserId);
        if (notification == null) return NotFound();

        notification.IsRead = true;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Notificare citită." });
    }

    // Fara categorie: marcheaza tot. Cu categorie: doar tabul curent.
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead([FromQuery] string? category)
    {
        if (category != null && !NotificationCategories.IsValid(category))
            return BadRequest(new { message = "Categorie invalidă." });

        var query = _db.Notifications.Where(n => n.UserId == _tenant.UserId && !n.IsRead);
        if (category != null)
        {
            var types = NotificationCategories.TypesIn(category);
            query = query.Where(n => types.Contains(n.Type));
        }

        await query.ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        return Ok(new { message = "Notificările au fost marcate ca citite." });
    }
}
