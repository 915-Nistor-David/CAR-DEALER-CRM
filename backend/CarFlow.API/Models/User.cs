namespace CarFlow.API.Models;

public class User
{
    public int UserId { get; set; }
    public int DealershipId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    // Owner | Vanzari | Junior (fara diacritice in claim-uri)
    public string Role { get; set; } = "Owner";
    // Dezactivare cont fara stergere — login blocat cand e false.
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Dealership? Dealership { get; set; }
}
