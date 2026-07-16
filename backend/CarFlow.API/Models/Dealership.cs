namespace CarFlow.API.Models;

public class Dealership
{
    public int DealershipId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
