using System.ComponentModel.DataAnnotations;

namespace CarFlow.API.Sales;

public class CreateSaleRequest
{
    [Range(0.01, 100_000_000)]
    public decimal SalePrice { get; set; }

    [Required]
    public DateOnly SaleDate { get; set; }

    // Cash | Finantat
    [Required]
    public string Type { get; set; } = "Cash";

    [MaxLength(150)]
    public string? FinancingPartner { get; set; }

    [MaxLength(300)]
    public string? FinancingTerms { get; set; }

    [Required, MaxLength(150)]
    public string BuyerName { get; set; } = string.Empty;

    [MaxLength(30)]
    public string? BuyerPhone { get; set; }
}

public class UpdateChecklistRequest
{
    public bool DocsHandedOver { get; set; }
    public bool PlatesDone { get; set; }
    public bool WarrantyGiven { get; set; }
}

public class SaleListDto
{
    public int SaleId { get; set; }
    public int VehicleId { get; set; }
    public string VehicleName { get; set; } = string.Empty;
    // null pentru non-Owner — confidentiale (profitul ar deconspira pretul de achizitie)
    public decimal? PurchasePrice { get; set; }
    public decimal TotalCosts { get; set; }
    public decimal SalePrice { get; set; }
    public decimal? Profit { get; set; }
    public DateOnly SaleDate { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? FinancingPartner { get; set; }
    public string BuyerName { get; set; } = string.Empty;
    public string? BuyerPhone { get; set; }
    public bool DocsHandedOver { get; set; }
    public bool PlatesDone { get; set; }
    public bool WarrantyGiven { get; set; }
}
