using CarFlow.API.Data;
using CarFlow.API.Vehicles;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarFlow.API.Controllers;

[ApiController]
[Route("api/stages")]
[Authorize]
public class StagesController : ControllerBase
{
    private readonly AppDbContext _db;

    public StagesController(AppDbContext db)
    {
        _db = db;
    }

    // Etapele pipeline-ului dealerului curent (filtrul de tenant se aplica automat).
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var stages = await _db.PipelineStages
            .OrderBy(s => s.SortOrder)
            .Select(s => new StageDto { StageId = s.StageId, Name = s.Name, SortOrder = s.SortOrder })
            .ToListAsync();

        return Ok(stages);
    }
}
