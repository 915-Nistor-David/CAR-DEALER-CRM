# syntax=docker/dockerfile:1
# Context de build = radacina repo-ului (vezi docker-compose.yml).

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copiem intai csproj-ul singur: atat timp cat dependentele nu se schimba,
# layerul de restore ramane in cache si rebuild-urile de cod sar peste el.
COPY backend/CarFlow.API/CarFlow.API.csproj backend/CarFlow.API/
RUN dotnet restore backend/CarFlow.API/CarFlow.API.csproj

COPY backend/ backend/
RUN dotnet publish backend/CarFlow.API/CarFlow.API.csproj \
      -c Release -o /app/publish --no-restore /p:UseAppHost=false

# Imaginea Debian standard, deliberat: NU alpine si NU InvariantGlobalization.
# ICU costa ~30 MB intr-o imagine construita o data, si nu merita sa descoperim
# pe server ca ceva depinde de el.
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# OBLIGATORIU, nu cosmetic. Daca /app/wwwroot nu exista la pornire, ASP.NET pune
# WebRootFileProvider pe NullFileProvider SI il cacheaza: UseStaticFiles()
# (Program.cs) nu mai serveste niciodata nimic. In acelasi timp
# LocalDiskFileStorage (Common/IFileStorage.cs) cade pe fallback-ul
# ContentRootPath/wwwroot, creeaza directorul si upload-ul REUSESTE.
# Rezultat fara linia asta: 200 la incarcare, 404 la fiecare <img>, permanent.
# Crearea directorului mai tarziu nu ajuta — providerul e deja cache-uit.
# wwwroot/vehicles/ e gitignored si e singurul continut al lui wwwroot, deci
# `dotnet publish` nu emite folderul de la sine.
RUN mkdir -p /app/wwwroot/vehicles && chown -R $APP_UID:$APP_UID /app/wwwroot

USER $APP_UID
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "CarFlow.API.dll"]
