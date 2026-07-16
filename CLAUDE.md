# CarFlow — Vehicle Pipeline CRM for Used Car Dealers

## What This Is
Commercial SaaS product (to be sold to real dealers, not a school project). Tracks each car from purchase to delivery on a kanban pipeline — the car's lifecycle is the product, unlike generic CRMs that track customers. Solo developer (David), also building YogaStudioManagement (thesis).

**Status: pilot MVP built and E2E-verified (2026-07-15).** Next milestone: demo to 3–5 Romanian dealers using the proposal doc (`CarFlow-Dealer-Proposal.pdf` in D:\YogaStudioManagement, docx on Desktop). The per-month pricing question is the go/no-go for building beyond MVP. Log dealer interview answers in this file.

## How to Run
- **Backend:** `dotnet run --project D:\CarDealerCRM\backend\CarFlow.API` → `http://localhost:5100` (Swagger at `/swagger`)
- **Frontend:** `npm run dev` in `frontend\carflow-client` → `http://localhost:5173`
- **DB:** local PostgreSQL 16 service, DB `carflow_db`, user `postgres` (password in `appsettings.json`). EF migrations auto-apply on startup. PG binaries at `D:\Program Files\PostgreSQL\16\bin` — psql NOT in PATH.
- **Test login:** `test@carflow.ro` / `parola123` (dealer "AutoTest Motors SRL"); second tenant `dealerb@test.ro` / `parola123`

## Stack
- **Backend:** ASP.NET Core 9 Web API, EF Core + Npgsql, JWT + BCrypt, Swashbuckle
- **Frontend:** React + TypeScript + Vite, Tailwind v4 (via `@tailwindcss/vite`), @dnd-kit (kanban drag), axios, react-router
- **UI language: Romanian** (hardcoded labels, no i18n framework)
- Photos on local disk behind `IFileStorage` abstraction (`LocalDiskFileStorage` → `wwwroot/vehicles/{id}/`, served via UseStaticFiles); swap to S3/R2 later without touching controllers

## Architecture — Multi-Tenancy (the load-bearing decision)
- Every tenant table implements `ITenantEntity { DealershipId }`
- JWT carries a `DealershipId` claim; scoped `TenantProvider` reads it from HttpContext
- **Global query filters** in `AppDbContext.OnModelCreating` scope every query to the current tenant; `SaveChangesAsync` override auto-stamps `DealershipId` on inserts — controllers can't leak or forget it
- `Users` table deliberately NOT filtered (login needs cross-tenant email lookup; email unique globally)
- Registration creates Dealership + Owner user + seeds the 10 default stages: Cumpărată → Transport → Service → Inspecție → Detailing → Listată → Gata de vânzare → Vânzare în curs → Vândută → Livrată (per-dealer rows, so per-dealer customization is possible later; no editing UI yet)

## Data Model (as built)
`Dealerships`, `Users` (roles: Owner/Staff/Vanzari — no diacritics in claims), `PipelineStages`, `Vehicles` (current `CurrentStageId`), `VehicleStatusHistory` (from→to, UserId, timestamp, note — audit trail, drives days-in-stage), `VehicleCosts` (categories: Transport/Service/Piese/Detailing/Altele), `VehiclePhotos` (categories: Exterior/Interior/Defecte), `Sales` (Cash/Finantat + financing partner/terms, buyer, post-sale checklist booleans)

## API Surface
- `POST /api/auth/register|login`
- `GET /api/stages`
- `GET|POST|PUT|DELETE /api/vehicles`, `GET /api/vehicles/{id}` (detail incl. photos/costs/history/sale/profit), `PUT /api/vehicles/{id}/stage` (writes history row)
- `POST|DELETE /api/vehicles/{id}/costs[/{costId}]`
- `POST|DELETE /api/vehicles/{id}/photos[/{photoId}]` (multipart: file + category)
- `POST /api/vehicles/{id}/sale` (auto-moves to Vândută + history), `GET /api/sales`, `PUT /api/sales/{id}/checklist`

## Key Conventions & Rules
- **Profit = salePrice − purchasePrice − Σcosts** — always computed, never stored
- Sold vehicles cannot be deleted (financial history protection)
- `DateOnly` for cost/sale dates; all timestamps `DateTime.UtcNow` (Npgsql timestamptz rejects non-UTC DateTime)
- Frontend auth: localStorage `carflow_token`/`carflow_user`; axios interceptor adds Bearer, redirects to /login on 401
- Board drag = optimistic update with rollback; days-in-stage badges: gray <3d, amber ≥3d, red ≥7d
- Frontend structure mirrors yoga project: `pages/`, `components/`, `services/`, `types/`, `utils/`; sub-components co-located in page files

## Gotchas
- `Microsoft.AspNetCore.OpenApi` package conflicts with Swashbuckle 10 (Microsoft.OpenApi type-load crash at startup) — keep it removed
- EF needs explicit `HasKey` for `StageId`/`HistoryId`/`CostId`/`PhotoId` (don't match `<ClassName>Id` convention)
- dotnet-ef tool v10 works fine against the net9.0 project
- **`appsettings.json` contains the local PG password — move to user-secrets before any git init/publish!**

## Post-MVP Backlog (deliberately cut from MVP; validate with dealers first)
Leads per car · marketplace listings tracking (Autovit/Mobile.de/OLX) · owner analytics dashboard (profit/month, avg days purchase→sale, stuck-car alerts) · stage-editing UI · staff user management · documents per vehicle (contracts, registration) · VIN decode (NHTSA vPIC) · reminders BackgroundService · S3/R2 photo storage · docker-compose for demo deploys

## Dealer Interview Log
_None yet — add entries here as meetings happen._
