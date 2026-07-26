using CarFlow.API.Common;

namespace CarFlow.API.Models;

public class VehicleStatusHistory : ITenantEntity
{
    public int HistoryId { get; set; }
    public int DealershipId { get; set; }
    public int VehicleId { get; set; }
    public int? FromStageId { get; set; }
    public int ToStageId { get; set; }
    public int UserId { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? Note { get; set; }
}
