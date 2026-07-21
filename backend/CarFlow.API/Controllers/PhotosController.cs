using CarFlow.API.Common;
using CarFlow.API.Data;
using CarFlow.API.Models;
using CarFlow.API.Vehicles;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarFlow.API.Controllers;

[ApiController]
[Route("api/vehicles/{vehicleId}/photos")]
[Authorize]
public class PhotosController : ControllerBase
{
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
    private static readonly string[] AllowedCategories = { "Exterior", "Interior", "Defecte" };
    private const long MaxSizeBytes = 10 * 1024 * 1024;

    private readonly AppDbContext _db;
    private readonly IFileStorage _storage;
    private readonly IPhotoUrlSigner _photoUrls;

    public PhotosController(AppDbContext db, IFileStorage storage, IPhotoUrlSigner photoUrls)
    {
        _db = db;
        _storage = storage;
        _photoUrls = photoUrls;
    }

    [HttpPost]
    public async Task<IActionResult> Upload(int vehicleId, IFormFile file, [FromForm] string category = "Exterior")
    {
        if (file.Length == 0)
            return BadRequest(new { message = "Fișier gol." });
        if (file.Length > MaxSizeBytes)
            return BadRequest(new { message = "Fișierul depășește 10 MB." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { message = "Format acceptat: JPG, PNG, WEBP." });
        if (!AllowedCategories.Contains(category))
            return BadRequest(new { message = "Categorie invalidă." });

        var vehicleExists = await _db.Vehicles.AnyAsync(v => v.VehicleId == vehicleId);
        if (!vehicleExists) return NotFound();

        var fileName = $"{Guid.NewGuid():N}{ext}";
        await using var stream = file.OpenReadStream();
        var relativePath = await _storage.SaveAsync($"vehicles/{vehicleId}", fileName, stream);

        var maxSort = await _db.VehiclePhotos
            .Where(p => p.VehicleId == vehicleId)
            .MaxAsync(p => (int?)p.SortOrder) ?? 0;

        var photo = new VehiclePhoto
        {
            VehicleId = vehicleId,
            FilePath = relativePath,
            Category = category,
            SortOrder = maxSort + 1
        };
        _db.VehiclePhotos.Add(photo);
        await _db.SaveChangesAsync();

        return Ok(new PhotoDto
        {
            PhotoId = photo.PhotoId,
            Url = _photoUrls.Sign(photo.FilePath)!,
            Category = photo.Category,
            SortOrder = photo.SortOrder
        });
    }

    [HttpDelete("{photoId}")]
    public async Task<IActionResult> Delete(int vehicleId, int photoId)
    {
        var photo = await _db.VehiclePhotos
            .FirstOrDefaultAsync(p => p.PhotoId == photoId && p.VehicleId == vehicleId);
        if (photo == null) return NotFound();

        _storage.Delete(photo.FilePath);
        _db.VehiclePhotos.Remove(photo);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Fotografia a fost ștearsă." });
    }
}
