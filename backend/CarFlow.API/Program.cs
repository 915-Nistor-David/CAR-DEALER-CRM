using System.Security.Claims;
using System.Text;
using CarFlow.API.Common;
using CarFlow.API.Data;
using CarFlow.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Refuzam sa pornim cu secretele placeholder din appsettings.json.
StartupConfigGuard.Validate(builder.Configuration, builder.Environment);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantProvider, TenantProvider>();
builder.Services.AddSingleton<IFileStorage, LocalDiskFileStorage>();
builder.Services.AddSingleton<IPhotoUrlSigner, PhotoUrlSigner>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IVehicleStageService, VehicleStageService>();
builder.Services.AddHostedService<ReminderBackgroundService>();

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var jwt = builder.Configuration.GetSection("Jwt");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!))
        };

        // Rolul si starea contului sunt in token, dar token-ul traieste 24h.
        // Fara asta, un cont dezactivat (sau retrogradat) ar pastra vechile
        // drepturi pana la expirare — verificam la fiecare request in DB.
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async ctx =>
            {
                var principal = ctx.Principal;
                if (!int.TryParse(principal?.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                {
                    ctx.Fail("Token fără identificator de utilizator.");
                    return;
                }

                var db = ctx.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                var user = await db.Users
                    .AsNoTracking()
                    .Where(u => u.UserId == userId)
                    .Select(u => new { u.IsActive, u.Role, u.DealershipId })
                    .FirstOrDefaultAsync();

                if (user == null || !user.IsActive)
                {
                    ctx.Fail("Cont inexistent sau dezactivat.");
                    return;
                }

                // Rolul sau dealerul schimbat dupa emitere invalideaza token-ul.
                if (user.Role != principal!.FindFirstValue(ClaimTypes.Role) ||
                    user.DealershipId.ToString() != principal.FindFirstValue("DealershipId"))
                {
                    ctx.Fail("Drepturile contului s-au schimbat — autentifică-te din nou.");
                }
            }
        };
    });
builder.Services.AddAuthorization();

// Originile permise vin din configurare, ca sa putem adauga IP-ul din LAN cand
// testam de pe telefon (Cors__Origins__1=http://192.168.x.x:5173) fara sa comitem
// o adresa specifica unei masini. Default: exact comportamentul de dinainte.
// NU folosim AllowAnyOrigin — aplicatia trimite header Authorization.
var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
                  ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(o => o.AddPolicy("Frontend", p =>
    p.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Aplica automat migrarile EF la pornire — baza de date e mereu sincronizata cu codul.
// Logam in jurul lor: pasul asta ruleaza inaintea oricarui middleware, deci o
// migrare esuata intr-un container produce altfel doar un crash-loop cu un stack
// trace EF, fara niciun indiciu ca despre migrari era vorba.
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    logger.LogInformation("Aplic migrarile EF...");
    db.Database.Migrate();
    logger.LogInformation("Migrari aplicate.");
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");

// Pozele stau in wwwroot, deci UseStaticFiles le-ar servi oricui stie URL-ul.
// Cerem semnatura cu expirare pusa de PhotoUrlSigner la iesirea din API.
// Tag-urile <img> nu pot trimite header Authorization, de aici semnatura in query string.
app.Use(async (ctx, next) =>
{
    if (ctx.Request.Path.StartsWithSegments("/vehicles", out var rest))
    {
        var signer = ctx.RequestServices.GetRequiredService<IPhotoUrlSigner>();
        var relativePath = "vehicles" + rest;

        if (!signer.IsValid(relativePath, ctx.Request.Query["e"], ctx.Request.Query["t"]))
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            await ctx.Response.WriteAsJsonAsync(new { message = "Link expirat sau invalid." });
            return;
        }
    }

    await next();
});

app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Sonda de liveness pentru platforma de hosting. Deliberat NU atinge baza de
// date: un health care interogheaza Postgres transforma o pana de baza intr-o
// bucla de restart. Toate controllerele in afara de Auth au [Authorize], iar
// /api/auth/login are efecte secundare, deci nu exista alt endpoint anonim care
// sa raspunda 200. Calea /healthz nu se ciocneste cu middleware-ul de pe /vehicles.
app.MapGet("/healthz", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

app.Run();
