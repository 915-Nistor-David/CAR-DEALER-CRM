using System.ComponentModel.DataAnnotations;

namespace CarFlow.API.Vehicles;

public class VehicleDto
{
    public int VehicleId { get; set; }
    public string? Vin { get; set; }
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Km { get; set; }
    public decimal PurchasePrice { get; set; }
    public string? AcquisitionSource { get; set; }
    public string? Description { get; set; }
    public int CurrentStageId { get; set; }
    public string CurrentStageName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? MainPhotoUrl { get; set; }
    public decimal TotalCosts { get; set; }
    public bool IsSold { get; set; }
    public DateTime EnteredStageAt { get; set; }
    public int DaysInStage { get; set; }
}

public class HistoryEntryDto
{
    public int HistoryId { get; set; }
    public string? FromStageName { get; set; }
    public string ToStageName { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string? Note { get; set; }
}

public class CostDto
{
    public int CostId { get; set; }
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public string? Description { get; set; }
}

public class PhotoDto
{
    public int PhotoId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class SaleInfoDto
{
    public int SaleId { get; set; }
    public decimal SalePrice { get; set; }
    public DateOnly SaleDate { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? FinancingPartner { get; set; }
    public string? FinancingTerms { get; set; }
    public string BuyerName { get; set; } = string.Empty;
    public string? BuyerPhone { get; set; }
    public bool DocsHandedOver { get; set; }
    public bool PlatesDone { get; set; }
    public bool WarrantyGiven { get; set; }
}

public class VehicleDetailDto : VehicleDto
{
    public List<PhotoDto> Photos { get; set; } = new();
    public List<CostDto> Costs { get; set; } = new();
    public List<HistoryEntryDto> History { get; set; } = new();
    public SaleInfoDto? Sale { get; set; }
    public decimal? Profit { get; set; }
}

public class SaveVehicleRequest
{
    [MaxLength(20)]
    public string? Vin { get; set; }

    [Required, MaxLength(50)]
    public string Make { get; set; } = string.Empty;

    [Required, MaxLength(80)]
    public string Model { get; set; } = string.Empty;

    [Range(1950, 2100)]
    public int Year { get; set; }

    [Range(0, int.MaxValue)]
    public int Km { get; set; }

    [Range(0, 100_000_000)]
    public decimal PurchasePrice { get; set; }

    [MaxLength(150)]
    public string? AcquisitionSource { get; set; }

    [MaxLength(4000)]
    public string? Description { get; set; }
}

public class ChangeStageRequest
{
    public int StageId { get; set; }

    [MaxLength(500)]
    public string? Note { get; set; }
}

public class StageDto
{
    public int StageId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
