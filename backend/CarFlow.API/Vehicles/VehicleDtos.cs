using System.ComponentModel.DataAnnotations;
using CarFlow.API.Documents;

namespace CarFlow.API.Vehicles;

public class VehicleDto
{
    public int VehicleId { get; set; }
    public string? Vin { get; set; }
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Km { get; set; }
    // null pentru non-Owner — pretul de achizitie e vizibil doar adminului
    public decimal? PurchasePrice { get; set; }
    public DateOnly? RARDate { get; set; }
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
    // Ultima schimbare de etapa: cine si cand. Patronul a cerut sa vada fara sa
    // deschida istoricul cine muta masinile. Derivat din VehicleStatusHistory,
    // fara coloane noi. null doar daca masina nu are nicio intrare in istoric.
    public string? LastMovedBy { get; set; }
    public DateTime? LastMovedAt { get; set; }
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
    // null pentru costurile inregistrate inainte sa existe coloana de autor
    public string? CreatedByName { get; set; }
    // Sterge doar autorul sau Ownerul — frontendul afiseaza butonul dupa acest flag
    public bool CanDelete { get; set; }
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
    public List<DocumentDto> Documents { get; set; } = new();
    public SaleInfoDto? Sale { get; set; }
    // null pentru non-Owner (profitul ar deconspira pretul de achizitie)
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

    public DateOnly? RARDate { get; set; }
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
    public int? AlertDays { get; set; }
    public string? NotifyRole { get; set; }
    public bool IsSaleReady { get; set; }
    public bool IsSoldStage { get; set; }
    // Cate masini sunt acum in aceasta etapa (pentru pagina de administrare)
    public int VehicleCount { get; set; }
}

public class SaveStageRequest
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Range(0, 365)]
    public int? AlertDays { get; set; }

    // Vanzari | Junior | null
    public string? NotifyRole { get; set; }

    public bool IsSaleReady { get; set; }
    public bool IsSoldStage { get; set; }
}

public class ReorderStagesRequest
{
    // Lista completa de StageId-uri in noua ordine
    [Required]
    public List<int> StageIds { get; set; } = new();
}
