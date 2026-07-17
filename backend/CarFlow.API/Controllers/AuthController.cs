using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CarFlow.API.Auth;
using CarFlow.API.Data;
using CarFlow.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace CarFlow.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    // Nume etapa, rolul notificat la intrarea masinii in etapa, marcaj "gata de vanzare"
    private static readonly (string Name, string? NotifyRole, bool IsSaleReady)[] DefaultStages =
    {
        ("Cumpărată", null, false),
        ("Transport", "Junior", false),
        ("Mecanică", "Junior", false),
        ("Vopsitorie", "Junior", false),
        ("Climă", "Junior", false),
        ("Detailing", "Junior", false),
        ("Listată", "Vanzari", false),
        ("Gata de vânzare", "Vanzari", true),
        ("Vânzare în curs", "Vanzari", false),
        ("Vândută", null, false),
        ("Livrată", null, false)
    };

    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    // Inregistrarea creeaza un dealership nou + contul de Owner + etapele default.
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        if (await _db.Users.AnyAsync(u => u.Email == req.Email))
            return BadRequest(new { message = "Există deja un cont cu acest email." });

        var dealership = new Dealership { Name = req.DealershipName };
        _db.Dealerships.Add(dealership);
        await _db.SaveChangesAsync();

        var user = new User
        {
            DealershipId = dealership.DealershipId,
            Name = req.Name,
            Email = req.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = "Owner"
        };
        _db.Users.Add(user);

        for (var i = 0; i < DefaultStages.Length; i++)
        {
            _db.PipelineStages.Add(new PipelineStage
            {
                DealershipId = dealership.DealershipId,
                Name = DefaultStages[i].Name,
                SortOrder = i + 1,
                NotifyRole = DefaultStages[i].NotifyRole,
                IsSaleReady = DefaultStages[i].IsSaleReady
            });
        }

        await _db.SaveChangesAsync();
        return Ok(BuildAuthResponse(user, dealership.Name));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var user = await _db.Users
            .Include(u => u.Dealership)
            .FirstOrDefaultAsync(u => u.Email == req.Email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Email sau parolă incorectă." });

        if (!user.IsActive)
            return Unauthorized(new { message = "Contul este dezactivat. Contactează administratorul." });

        return Ok(BuildAuthResponse(user, user.Dealership?.Name ?? ""));
    }

    private AuthResponse BuildAuthResponse(User user, string dealershipName)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("DealershipId", user.DealershipId.ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(double.Parse(_config["Jwt:ExpiryHours"] ?? "24")),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new AuthResponse
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            UserId = user.UserId,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            DealershipId = user.DealershipId,
            DealershipName = dealershipName
        };
    }
}
