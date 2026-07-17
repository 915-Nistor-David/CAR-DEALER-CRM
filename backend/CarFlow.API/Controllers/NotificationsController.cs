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
    private readonly AppDbContext _db;
    private readonly ITenantProvider _tenant;

    public NotificationsController(AppDbContext db, ITenantProvider tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    // Ultimele 50 de notificari ale utilizatorului curent + numarul de necitite.
    [HttpGet]
    public async Task<IActionResult> GetMine()
    {
        var baseQuery = _db.Notifications.Where(n => n.UserId == _tenant.UserId);

        var unreadCount = await baseQuery.CountAsync(n => !n.IsRead);
        var items = await baseQuery
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
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

        return Ok(new { unreadCount, items });
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

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        await _db.Notifications
            .Where(n => n.UserId == _tenant.UserId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));

        return Ok(new { message = "Toate notificările au fost marcate ca citite." });
    }
}
