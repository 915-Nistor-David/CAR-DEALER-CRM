using CarFlow.API.Data;
using CarFlow.API.Models;
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
    private static readonly string?[] AllowedNotifyRoles = { null, "Vanzari", "Junior" };

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
            .Select(s => new StageDto
            {
                StageId = s.StageId,
                Name = s.Name,
                SortOrder = s.SortOrder,
                AlertDays = s.AlertDays,
                NotifyRole = s.NotifyRole,
                IsSaleReady = s.IsSaleReady,
                VehicleCount = _db.Vehicles.Count(v => v.CurrentStageId == s.StageId)
            })
            .ToListAsync();

        return Ok(stages);
    }

    [HttpPost]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Create(SaveStageRequest req)
    {
        if (!AllowedNotifyRoles.Contains(req.NotifyRole))
            return BadRequest(new { message = "Rol de notificare invalid (Vanzari, Junior sau gol)." });

        var maxOrder = await _db.PipelineStages.MaxAsync(s => (int?)s.SortOrder) ?? 0;
        var stage = new PipelineStage
        {
            Name = req.Name,
            SortOrder = maxOrder + 1,
            AlertDays = req.AlertDays,
            NotifyRole = req.NotifyRole,
            IsSaleReady = req.IsSaleReady
        };
        _db.PipelineStages.Add(stage);
        await _db.SaveChangesAsync();

        return Ok(new { stageId = stage.StageId });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Update(int id, SaveStageRequest req)
    {
        if (!AllowedNotifyRoles.Contains(req.NotifyRole))
            return BadRequest(new { message = "Rol de notificare invalid (Vanzari, Junior sau gol)." });

        var stage = await _db.PipelineStages.FirstOrDefaultAsync(s => s.StageId == id);
        if (stage == null) return NotFound();

        stage.Name = req.Name;
        stage.AlertDays = req.AlertDays;
        stage.NotifyRole = req.NotifyRole;
        stage.IsSaleReady = req.IsSaleReady;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Etapa a fost actualizată." });
    }

    // Reordonare completa: primeste toate StageId-urile in noua ordine.
    [HttpPut("reorder")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Reorder(ReorderStagesRequest req)
    {
        var stages = await _db.PipelineStages.ToListAsync();

        if (req.StageIds.Count != stages.Count || stages.Any(s => !req.StageIds.Contains(s.StageId)))
            return BadRequest(new { message = "Lista de etape nu corespunde cu etapele existente." });

        for (var i = 0; i < req.StageIds.Count; i++)
            stages.First(s => s.StageId == req.StageIds[i]).SortOrder = i + 1;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Ordinea etapelor a fost salvată." });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Delete(int id)
    {
        var stage = await _db.PipelineStages.FirstOrDefaultAsync(s => s.StageId == id);
        if (stage == null) return NotFound();

        var hasVehicles = await _db.Vehicles.AnyAsync(v => v.CurrentStageId == id);
        if (hasVehicles)
            return BadRequest(new { message = "Există mașini în această etapă — mută-le întâi în altă etapă." });

        // Istoricul vechi poate referi etapa; il pastram (FK-ul e pe id, numele se pierde).
        var referencedInHistory = await _db.VehicleStatusHistory
            .AnyAsync(h => h.ToStageId == id || h.FromStageId == id);
        if (referencedInHistory)
            return BadRequest(new { message = "Etapa apare în istoricul mașinilor și nu poate fi ștearsă. O poți redenumi." });

        _db.PipelineStages.Remove(stage);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Etapa a fost ștearsă." });
    }
}
