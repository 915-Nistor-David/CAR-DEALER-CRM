namespace CarFlow.API.Models;

public class User
{
    public int UserId { get; set; }
    public int DealershipId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    // Owner | Staff | Vanzari (fara diacritice in claim-uri)
    public string Role { get; set; } = "Owner";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Dealership? Dealership { get; set; }
}
