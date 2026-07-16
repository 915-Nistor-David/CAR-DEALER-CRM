namespace CarFlow.API.Common;

// Abstractie peste stocarea fisierelor — implementarea actuala scrie pe disc
// (wwwroot), iar mai tarziu poate fi inlocuita cu S3/R2 fara sa schimbam controllerele.
public interface IFileStorage
{
    Task<string> SaveAsync(string relativeFolder, string fileName, Stream content);
    void Delete(string relativePath);
}

public class LocalDiskFileStorage : IFileStorage
{
    private readonly string _root;

    public LocalDiskFileStorage(IWebHostEnvironment env)
    {
        _root = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
    }

    public async Task<string> SaveAsync(string relativeFolder, string fileName, Stream content)
    {
        var folder = Path.Combine(_root, relativeFolder);
        Directory.CreateDirectory(folder);
        var fullPath = Path.Combine(folder, fileName);
        await using var fs = new FileStream(fullPath, FileMode.Create);
        await content.CopyToAsync(fs);
        return $"{relativeFolder.Replace('\\', '/')}/{fileName}";
    }

    public void Delete(string relativePath)
    {
        var fullPath = Path.Combine(_root, relativePath.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(fullPath)) File.Delete(fullPath);
    }
}
