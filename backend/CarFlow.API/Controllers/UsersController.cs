using CarFlow.API.Common;
using CarFlow.API.Data;
using CarFlow.API.Models;
using CarFlow.API.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarFlow.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Owner")]
public class UsersController : ControllerBase
{
    private static readonly string[] AllowedRoles = { "Owner", "Vanzari", "Junior" };

    private readonly AppDbContext _db;
    private readonly ITenantProvider _tenant;

    public UsersController(AppDbContext db, ITenantProvider tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    // Users NU are filtru global de tenant (login-ul cauta cross-tenant),
    // asa ca filtram explicit pe dealerul curent in fiecare query de aici.
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _db.Users
            .Where(u => u.DealershipId == _tenant.DealershipId)
            .OrderBy(u => u.Name)
            .Select(u => new UserDto
            {
                UserId = u.UserId,
                Name = u.Name,
                Email = u.Email,
                Role = u.Role,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateUserRequest req)
    {
        if (!AllowedRoles.Contains(req.Role))
            return BadRequest(new { message = "Rol invalid. Roluri permise: Owner, Vanzari, Junior." });

        if (await _db.Users.AnyAsync(u => u.Email == req.Email))
            return BadRequest(new { message = "Există deja un cont cu acest email." });

        var user = new User
        {
            DealershipId = _tenant.DealershipId,
            Name = req.Name,
            Email = req.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = req.Role,
            IsActive = true
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new { userId = user.UserId });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateUserRequest req)
    {
        if (!AllowedRoles.Contains(req.Role))
            return BadRequest(new { message = "Rol invalid. Roluri permise: Owner, Vanzari, Junior." });

        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.UserId == id && u.DealershipId == _tenant.DealershipId);
        if (user == null) return NotFound();

        // Ownerul nu se poate retrograda/dezactiva singur — ar ramane dealerul fara admin.
        if (user.UserId == _tenant.UserId && (req.Role != "Owner" || !req.IsActive))
            return BadRequest(new { message = "Nu îți poți schimba propriul rol sau dezactiva propriul cont." });

        user.Role = req.Role;
        user.IsActive = req.IsActive;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Utilizatorul a fost actualizat." });
    }
}
