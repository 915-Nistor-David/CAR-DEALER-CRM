namespace CarFlow.API.Models;

public class Dealership
{
    public int DealershipId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Setari alerte (editabile de Owner din pagina /etape)
    public int DefaultStageAlertDays { get; set; } = 7;   // prag implicit "sta prea mult in etapa"
    public int StockAlertDays { get; set; } = 60;          // prag "masina prea veche in stoc"
}
