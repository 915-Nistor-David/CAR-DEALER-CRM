using System.Security.Cryptography;
using System.Text;

namespace CarFlow.API.Common;

// Semneaza URL-urile pozelor cu un HMAC cu expirare, ca fisierele din wwwroot
// sa nu mai fie accesibile public doar pentru ca numele lor e ghicit sau scurs.
// Cheia e derivata din Jwt:Key (deja secret, tinut in user-secrets).
// Cand migram pe S3/R2, acelasi concept e nativ acolo (presigned URLs).
public interface IPhotoUrlSigner
{
    // "vehicles/6/abc.jpg" -> "vehicles/6/abc.jpg?e=1753034400&t=<hmac>"
    string? Sign(string? relativePath);
    bool IsValid(string relativePath, string? expiry, string? token);
}

public class PhotoUrlSigner : IPhotoUrlSigner
{
    // 8 ore acopera o zi de lucru; un tab lasat deschis peste noapte cere refresh.
    private static readonly TimeSpan Lifetime = TimeSpan.FromHours(8);

    private readonly byte[] _key;

    public PhotoUrlSigner(IConfiguration config)
    {
        // Derivam o cheie dedicata din cea de JWT, ca semnatura pozelor sa nu
        // poata fi folosita pentru altceva (si invers).
        _key = SHA256.HashData(Encoding.UTF8.GetBytes($"photo-url::{config["Jwt:Key"]}"));
    }

    public string? Sign(string? relativePath)
    {
        if (string.IsNullOrEmpty(relativePath)) return relativePath;

        var expiry = DateTimeOffset.UtcNow.Add(Lifetime).ToUnixTimeSeconds().ToString();
        return $"{relativePath}?e={expiry}&t={Compute(relativePath, expiry)}";
    }

    public bool IsValid(string relativePath, string? expiry, string? token)
    {
        if (string.IsNullOrEmpty(expiry) || string.IsNullOrEmpty(token)) return false;
        if (!long.TryParse(expiry, out var unix)) return false;
        if (DateTimeOffset.FromUnixTimeSeconds(unix) < DateTimeOffset.UtcNow) return false;

        var expected = Encoding.UTF8.GetBytes(Compute(relativePath, expiry));
        var actual = Encoding.UTF8.GetBytes(token);
        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }

    private string Compute(string relativePath, string expiry)
    {
        var payload = Encoding.UTF8.GetBytes($"{relativePath.Trim('/')}|{expiry}");
        return Base64Url(HMACSHA256.HashData(_key, payload));
    }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).Replace('+', '-').Replace('/', '_').TrimEnd('=');
}
