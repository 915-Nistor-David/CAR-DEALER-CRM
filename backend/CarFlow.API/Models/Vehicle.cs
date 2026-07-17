using CarFlow.API.Common;

namespace CarFlow.API.Models;

public class Vehicle : ITenantEntity
{
    public int VehicleId { get; set; }
    public int DealershipId { get; set; }
    public string? Vin { get; set; }
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Km { get; set; }
    public decimal PurchasePrice { get; set; }
    public string? AcquisitionSource { get; set; }
    public int CurrentStageId { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Programare RAR (modificabila oricand)
    public DateOnly? RARDate { get; set; }
    // Deduplicare remindere: data RAR pentru care s-a trimis deja reminderul
    // (daca RARDate se schimba, markerul nu mai corespunde si se retrimite)
    public DateOnly? RARReminderSentFor { get; set; }
    // Deduplicare "sta prea mult in etapa" — resetat la null la fiecare mutare
    public DateTime? StuckReminderSentAt { get; set; }
    // Deduplicare "prea veche in stoc"
    public DateTime? StockAgingReminderSentAt { get; set; }

    public PipelineStage? CurrentStage { get; set; }
    public List<VehiclePhoto> Photos { get; set; } = new();
    public List<VehicleCost> Costs { get; set; } = new();
    public List<VehicleStatusHistory> History { get; set; } = new();
    public Sale? Sale { get; set; }
}
