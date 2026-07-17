using CarFlow.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarFlow.API.Controllers;

public class StageMoveCountDto
{
    public string StageName { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class UserActivityDto
{
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int TotalMoves { get; set; }
    public DateTime? LastMoveAt { get; set; }
    public List<StageMoveCountDto> StageBreakdown { get; set; } = new();
}

[ApiController]
[Route("api/reports")]
[Authorize(Roles = "Owner")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReportsController(AppDbContext db)
    {
        _db = db;
    }

    // Cine a mutat cate masini intre etape in intervalul dat (default: ultimele 30 zile).
    // Include si adaugarile in stoc (FromStageId null) — sunt tot munca.
    [HttpGet("activity")]
    public async Task<IActionResult> Activity([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var fromDate = from ?? DateOnly.FromDateTime(DateTime.Today.AddDays(-30));
        var toDate = to ?? DateOnly.FromDateTime(DateTime.Today);

        var fromUtc = DateTime.SpecifyKind(fromDate.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(toDate.AddDays(1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);

        var moves = await _db.VehicleStatusHistory
            .Where(h => h.Timestamp >= fromUtc && h.Timestamp < toUtc)
            .Select(h => new { h.UserId, h.ToStageId, h.Timestamp })
            .ToListAsync();

        var userIds = moves.Select(m => m.UserId).Distinct().ToList();
        var users = await _db.Users
            .Where(u => userIds.Contains(u.UserId))
            .Select(u => new { u.UserId, u.Name, u.Role })
            .ToDictionaryAsync(u => u.UserId);

        var stageNames = await _db.PipelineStages
            .Select(s => new { s.StageId, s.Name })
            .ToDictionaryAsync(s => s.StageId, s => s.Name);

        var result = moves
            .GroupBy(m => m.UserId)
            .Select(g => new UserActivityDto
            {
                UserId = g.Key,
                UserName = users.TryGetValue(g.Key, out var u) ? u.Name : "Utilizator șters",
                Role = users.TryGetValue(g.Key, out var u2) ? u2.Role : "",
                TotalMoves = g.Count(),
                LastMoveAt = g.Max(m => m.Timestamp),
                StageBreakdown = g
                    .GroupBy(m => m.ToStageId)
                    .Select(sg => new StageMoveCountDto
                    {
                        // Etapele sterse nu mai au nume — le afisam generic
                        StageName = stageNames.TryGetValue(sg.Key, out var name) ? name : "Etapă ștearsă",
                        Count = sg.Count()
                    })
                    .OrderByDescending(s => s.Count)
                    .ToList()
            })
            .OrderByDescending(r => r.TotalMoves)
            .ToList();

        return Ok(new { from = fromDate, to = toDate, users = result });
    }
}
