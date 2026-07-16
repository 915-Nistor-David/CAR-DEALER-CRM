using CarFlow.API.Common;

namespace CarFlow.API.Models;

public class Sale : ITenantEntity
{
    public int SaleId { get; set; }
    public int DealershipId { get; set; }
    public int VehicleId { get; set; }
    public decimal SalePrice { get; set; }
    public DateOnly SaleDate { get; set; }
    // Cash | Finantat
    public string Type { get; set; } = "Cash";
    public string? FinancingPartner { get; set; }
    public string? FinancingTerms { get; set; }
    public string BuyerName { get; set; } = string.Empty;
    public string? BuyerPhone { get; set; }
    // checklist post-vanzare
    public bool DocsHandedOver { get; set; }
    public bool PlatesDone { get; set; }
    public bool WarrantyGiven { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
