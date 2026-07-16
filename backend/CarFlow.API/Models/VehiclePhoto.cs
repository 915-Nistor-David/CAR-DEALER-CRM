using CarFlow.API.Common;

namespace CarFlow.API.Models;

public class VehiclePhoto : ITenantEntity
{
    public int PhotoId { get; set; }
    public int DealershipId { get; set; }
    public int VehicleId { get; set; }
    // cale relativa sub wwwroot, ex: vehicles/12/abc.jpg
    public string FilePath { get; set; } = string.Empty;
    // Exterior | Interior | Defecte
    public string Category { get; set; } = "Exterior";
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
