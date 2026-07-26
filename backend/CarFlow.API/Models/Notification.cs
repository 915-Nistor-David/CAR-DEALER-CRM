using CarFlow.API.Common;

namespace CarFlow.API.Models;

// Notificare in-app, materializata per destinatar (fan-out la creare):
// o notificare catre un rol = cate un rand pentru fiecare user din rolul respectiv.
public class Notification : ITenantEntity
{
    public int NotificationId { get; set; }
    public int DealershipId { get; set; }
    public int UserId { get; set; }
    // StageMove | StuckInStage | StockAging | RAR | Document
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    // Ruta din frontend catre care duce click-ul (ex. /vehicles/5)
    public string? LinkUrl { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
