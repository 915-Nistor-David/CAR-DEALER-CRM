# CarFlow — Vehicle Pipeline CRM for Used Car Dealers

## What This Is
Commercial SaaS product (to be sold to real dealers, not a school project). Tracks each car from purchase to delivery on a kanban pipeline — the car's lifecycle is the product, unlike generic CRMs that track customers. Solo developer (David), also building YogaStudioManagement (thesis).

**Status: Etapa 2 built and E2E-verified (2026-07-18)** — RBAC (Owner/Vanzari/Junior), granular pipeline stages, in-app notifications, reminders (RAR/documents/stuck-in-stage/stock-aging), vehicle documents checklist, employee activity report. Built from the first dealer interview feedback (see Dealer Interview Log below). **Deferred until the seller-team meeting:** interested-clients (leads) database + auto-matching + wa.me message links; sales statistics page. Pricing question still open.

## How to Run
- **Backend:** `dotnet run --project D:\CarDealerCRM\backend\CarFlow.API` → `http://localhost:5100` (Swagger at `/swagger`)
- **Frontend:** `npm run dev` in `frontend\carflow-client` → `http://localhost:5173`
- **DB:** local PostgreSQL 16 service, DB `carflow_db`, user `postgres` (password in `appsettings.json`). EF migrations auto-apply on startup. PG binaries at `D:\Program Files\PostgreSQL\16\bin` — psql NOT in PATH.
- **Test logins (all `parola123`):** `test@carflow.ro` (Owner, "AutoTest Motors SRL"), `vanzator@test.ro` (Vanzari), `junior@test.ro` (Junior); second tenant `dealerb@test.ro` (Owner)

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
- Registration creates Dealership + Owner user + seeds 11 default stages: Cumpărată → Transport → Mecanică → Vopsitorie → Climă → Detailing → Listată → Gata de vânzare → Vânzare în curs → Vândută → Livrată, with per-stage `NotifyRole` pre-wired (junior stages → Junior, sales stages → Vanzari) and `IsSaleReady` on "Gata de vânzare". Owner edits stages at `/etape` (rename/reorder/add/delete; delete blocked if stage has vehicles or appears in history)

## Data Model (as built)
`Dealerships` (+ `DefaultStageAlertDays`=7, `StockAlertDays`=60 — alert thresholds, editable on `/etape`), `Users` (roles: **Owner/Vanzari/Junior** — no diacritics in claims; `IsActive` blocks login when false), `PipelineStages` (+ `AlertDays` per-stage stuck threshold, `NotifyRole`, `IsSaleReady`), `Vehicles` (+ `RARDate` and three reminder-dedup markers: `RARReminderSentFor`, `StuckReminderSentAt` — cleared on stage move, `StockAgingReminderSentAt`), `VehicleStatusHistory` (audit trail, drives days-in-stage AND the activity report), `VehicleCosts`, `VehiclePhotos`, `Sales`, **`Notifications`** (fan-out per recipient UserId; Type: StageMove/StuckInStage/StockAging/RAR/Document; IsRead), **`VehicleDocuments`** (per-vehicle checklist: Name, IsDone, DueDate?, ReminderSent)

### RBAC rules (dealer requirement: purchase price is Owner-only)
- `PurchasePrice` and `Profit` are `null` in every DTO for non-Owner (profit would reveal purchase price); non-Owner updates can't overwrite PurchasePrice (ignored server-side). Costs stay visible to all (juniors log them).
- Stage moves: **all roles**. Vehicle create/edit + sales: Owner+Vanzari. Vehicle delete, users, stages, settings, reports: Owner only. `GET /api/sales` is 403 for Junior — Dashboard skips the sales fetch and hides profit tiles for non-Owner.
- Stage move → notification to Owner + destination stage's `NotifyRole`, excluding the actor; note is included in the message (the "junior says car is ready" flow).
- `ReminderBackgroundService`: pass at startup +15s, then every 30 min. RAR ≤3 days → Owner+Junior (re-sends if date changes); unchecked document DueDate ≤3 days → Owner; days-in-stage ≥ (stage.AlertDays ?? dealer default) → Owner + stage NotifyRole; unsold vehicle in stock ≥ StockAlertDays → Owner+Vanzari. All queries `IgnoreQueryFilters()` (no HttpContext) with explicit DealershipId.

## API Surface
- `POST /api/auth/register|login` (login 401 if `IsActive=false`)
- `GET|POST|PUT|DELETE /api/stages[/{id}]` + `PUT /api/stages/reorder` (writes Owner-only)
- `GET|POST|PUT|DELETE /api/vehicles`, `GET /api/vehicles/{id}` (detail incl. photos/costs/history/documents/sale/profit), `PUT /api/vehicles/{id}/stage` (history row + notification + clears stuck marker)
- `POST|DELETE /api/vehicles/{id}/costs[/{costId}]`, `POST|DELETE /api/vehicles/{id}/photos[/{photoId}]`
- `POST|PUT|DELETE /api/vehicles/{id}/documents[/{docId}]` (checklist; DueDate change resets ReminderSent)
- `POST /api/vehicles/{id}/sale`, `GET /api/sales`, `PUT /api/sales/{id}/checklist` (all Owner+Vanzari)
- `GET /api/notifications` (mine, last 50 + unreadCount), `PUT /api/notifications/{id}/read|read-all`
- `GET|POST|PUT /api/users[/{id}]` (Owner; self-demote/deactivate blocked)
- `GET|PUT /api/settings` (alert thresholds; PUT Owner)
- `GET /api/reports/activity?from=&to=` (Owner; per-user move counts + stage breakdown)

## Frontend routes added in Etapa 2
`/utilizatori`, `/etape` (+ settings card), `/activitate` — Owner-only via `ProtectedRoute requiredRole`. Navbar shows links per role + `NotificationBell` (60s polling, unread badge, mark-read on click → navigates to LinkUrl). Board cards show RAR badge when ≤3 days away; VehicleDetail has "Acte" checklist section and RAR row; VehicleForm hides purchase price for non-Owner and has a RAR date field.

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
- Git repo initialized 2026-07-16. PG password + JWT key now live in `dotnet user-secrets` (project `CarFlow.API`, not committed); `appsettings.json` only has `CHANGE_ME` placeholders. Re-run the two `dotnet user-secrets set` commands on a fresh clone/machine.

## Backlog (validate with dealers first)
- **Next (after seller meeting):** interested-clients (leads) DB — Make+Model required, engine/year/budget optional, phone, status (Cash/Credit aprobat/În așteptare) · auto-match when a vehicle enters an `IsSaleReady` stage → notify sellers + **wa.me link with prefilled Romanian message** (decided: manual send first — free, no Meta approval; Meta WhatsApp Business Cloud API evaluated later: needs verified business, template approval, ~€0.05/conversation) · lead follow-up reminders · sales statistics page (most-sold + fastest-sold makes, km/year range filters)
- Marketplace listings tracking (Autovit/Mobile.de/OLX) · VIN decode (NHTSA vPIC) · S3/R2 photo storage · docker-compose for demo deploys · email notifications (in-app only for now)

## Dealer Interview Log

### 2026-07-17 — First dealer (administrator/patron). Verdict: MVP is OK.
Requirements gathered (Etapa 2 items ✅ built 2026-07-18; rest deferred):
1. ✅ **RBAC, 3 user types:** Administratori (patroni), Selleri (vânzări), Juniori (service/detailing/vopsitorie). App is effectively per-dealer (multi-tenancy kept — one tenant per dealer deployment).
2. ✅ **Purchase price visible ONLY to admin** — explicit demand from the patron.
3. ✅ **Track WHO moves cars between statuses** ("să contorizăm angajații, să vadă cine muncește mai mult") → activity report.
4. ✅ **Granular statuses:** MECANICĂ, VOPSITORIE, CLIMĂ, DETAILING (instead of generic Service); counts per status with photo + click-through (board already did this).
5. ✅ **RAR reminders** — schedulable date, editable when it changes.
6. ✅ **Document reminders** (generic documents for now).
7. ✅ **Stuck alerts:** car too long in a status → notify that team + admin; too long in stock (~2 months) → notify admin + sellers.
8. ✅ **Comments on stage moves** notifying admin + relevant role (junior marks "gata de vânzare" → sellers + admin notified).
9. ⏳ **Interested clients:** client wants brand X model Y (only brand+model required); when a matching car reaches "ready for sale" → message the client (SMS/WhatsApp, likely WhatsApp, with dealer site link + "Bună, sunt dealerul X, am primit mașina Y de care ați fost interesat…"). Decision: wa.me manual-send first.
10. ⏳ **Client re-engagement:** store clients with approved-but-paused credit or waiting cash buyers; notify them about new stock/offers later.
11. ⏳ **Sales statistics:** most-sold and fastest-sold cars, filters by make, km range, year range — to guide future acquisitions.
- **Sellers' exact needs TBD** — David has a follow-up meeting with the sales team.
