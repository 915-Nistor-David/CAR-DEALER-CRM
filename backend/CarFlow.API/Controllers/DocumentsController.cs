using CarFlow.API.Data;
using CarFlow.API.Documents;
using CarFlow.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarFlow.API.Controllers;

// Acte de bifat per masina. Toate rolurile pot bifa (vanzatorii predau actele,
// juniorii le pregatesc) — dealerul a cerut explicit acest flux.
[ApiController]
[Route("api/vehicles/{vehicleId}/documents")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public DocumentsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> Create(int vehicleId, SaveDocumentRequest req)
    {
        var vehicleExists = await _db.Vehicles.AnyAsync(v => v.VehicleId == vehicleId);
        if (!vehicleExists) return NotFound();

        var doc = new VehicleDocument
        {
            VehicleId = vehicleId,
            Name = req.Name,
            IsDone = req.IsDone,
            DueDate = req.DueDate
        };
        _db.VehicleDocuments.Add(doc);
        await _db.SaveChangesAsync();

        return Ok(new { documentId = doc.DocumentId });
    }

    [HttpPut("{docId}")]
    public async Task<IActionResult> Update(int vehicleId, int docId, SaveDocumentRequest req)
    {
        var doc = await _db.VehicleDocuments
            .FirstOrDefaultAsync(d => d.DocumentId == docId && d.VehicleId == vehicleId);
        if (doc == null) return NotFound();

        doc.Name = req.Name;
        doc.IsDone = req.IsDone;
        // Termen schimbat → reminderul trimis nu mai e valabil
        if (doc.DueDate != req.DueDate)
            doc.ReminderSent = false;
        doc.DueDate = req.DueDate;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Actul a fost actualizat." });
    }

    [HttpDelete("{docId}")]
    public async Task<IActionResult> Delete(int vehicleId, int docId)
    {
        var doc = await _db.VehicleDocuments
            .FirstOrDefaultAsync(d => d.DocumentId == docId && d.VehicleId == vehicleId);
        if (doc == null) return NotFound();

        _db.VehicleDocuments.Remove(doc);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Actul a fost șters." });
    }
}
