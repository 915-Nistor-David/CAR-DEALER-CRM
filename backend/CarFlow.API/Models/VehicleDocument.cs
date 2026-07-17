using CarFlow.API.Common;

namespace CarFlow.API.Models;

// Act de bifat pentru o masina (ex. carte de identitate a vehiculului, contract, fise service).
public class VehicleDocument : ITenantEntity
{
    public int DocumentId { get; set; }
    public int DealershipId { get; set; }
    public int VehicleId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsDone { get; set; }
    public DateOnly? DueDate { get; set; }
    // Deduplicare reminder termen
    public bool ReminderSent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
