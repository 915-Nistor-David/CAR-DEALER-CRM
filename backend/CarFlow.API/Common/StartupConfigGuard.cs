namespace CarFlow.API.Common;

// Opreste pornirea daca secretele au ramas placeholder-ele din appsettings.json.
// Motiv: user-secrets se incarca DOAR in Development, deci un deploy in Production
// fara variabile de mediu ar semna token-uri cu o cheie publica in repo —
// oricine ar putea forja {DealershipId: <orice>, role: "Owner"}.
public static class StartupConfigGuard
{
    private const int MinKeyLength = 32;

    public static void Validate(IConfiguration config)
    {
        var problems = new List<string>();

        var jwtKey = config["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(jwtKey))
            problems.Add("Jwt:Key lipseste.");
        else if (jwtKey.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
            problems.Add("Jwt:Key este inca placeholder-ul din appsettings.json.");
        else if (jwtKey.Length < MinKeyLength)
            problems.Add($"Jwt:Key are {jwtKey.Length} caractere; minim {MinKeyLength}.");

        var conn = config.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(conn))
            problems.Add("ConnectionStrings:DefaultConnection lipseste.");
        else if (conn.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
            problems.Add("Parola bazei de date este inca placeholder-ul din appsettings.json.");

        if (problems.Count == 0) return;

        throw new InvalidOperationException(
            "Configurare invalida — aplicatia nu poate porni:" + Environment.NewLine +
            string.Join(Environment.NewLine, problems.Select(p => "  - " + p)) +
            Environment.NewLine + Environment.NewLine +
            "Pentru dezvoltare local, ruleaza din folderul CarFlow.API:" + Environment.NewLine +
            "  dotnet user-secrets set \"Jwt:Key\" \"<minim 32 de caractere aleatorii>\"" + Environment.NewLine +
            "  dotnet user-secrets set \"ConnectionStrings:DefaultConnection\" \"Host=localhost;Port=5432;Database=carflow_db;Username=postgres;Password=<parola>\"" +
            Environment.NewLine +
            "In productie, foloseste variabile de mediu (Jwt__Key, ConnectionStrings__DefaultConnection).");
    }
}
