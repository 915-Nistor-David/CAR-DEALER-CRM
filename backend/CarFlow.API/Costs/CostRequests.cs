using System.ComponentModel.DataAnnotations;

namespace CarFlow.API.Costs;

public class CreateCostRequest
{
    // Transport | Service | Piese | Detailing | Altele
    [Required, MaxLength(50)]
    public string Category { get; set; } = string.Empty;

    [Range(0.01, 100_000_000)]
    public decimal Amount { get; set; }

    [Required]
    public DateOnly Date { get; set; }

    [MaxLength(300)]
    public string? Description { get; set; }
}
