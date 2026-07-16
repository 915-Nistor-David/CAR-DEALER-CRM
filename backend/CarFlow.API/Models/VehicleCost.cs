using CarFlow.API.Common;

namespace CarFlow.API.Models;

public class VehicleCost : ITenantEntity
{
    public int CostId { get; set; }
    public int DealershipId { get; set; }
    public int VehicleId { get; set; }
    // Transport | Service | Piese | Detailing | Altele
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
