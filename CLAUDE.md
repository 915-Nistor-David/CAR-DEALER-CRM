# CarFlow — Vehicle Pipeline CRM for Used Car Dealers

## What This Is
Commercial SaaS product (to be sold to real dealers, not a school project). Tracks each car from purchase to delivery on a kanban pipeline — the car's lifecycle is the product, unlike generic CRMs that track customers. Solo developer (David), also building YogaStudioManagement (thesis).

**Status: Etapa 3 (security + correctness hardening) done and E2E-verified 2026-07-21.** Etapa 2 (2026-07-18) built RBAC (Owner/Vanzari/Junior), granular pipeline stages, in-app notifications, reminders (RAR/documents/stuck-in-stage/stock-aging), vehicle documents checklist, employee activity report — all from the first dealer interview (log below). **Deferred until the seller-team meeting:** interested-clients (leads) database + auto-matching + wa.me message links; sales statistics page. Pricing question still open.

## How to Run
- **Backend:** `dotnet run --project D:\CarDealerCRM\backend\CarFlow.API` → `http://localhost:5100` (Swagger at `/swagger`)
- **Frontend:** `npm run dev` in `frontend\carflow-client` → `http://localhost:5173`. API origin comes from `VITE_API_URL` (see `.env.example`); defaults to `http://localhost:5100`.
- **DB:** local PostgreSQL 16 service, DB `carflow_db`, user `postgres` (password in user-secrets). EF migrations auto-apply on startup. PG binaries at `D:\Program Files\PostgreSQL\16\bin` — psql NOT in PATH.
- **Startup fails fast** if `Jwt:Key` or the DB password is still the `CHANGE_ME` placeholder — see `StartupConfigGuard`. Both live in `dotnet user-secrets`, which only loads in Development; use `Jwt__Key` / `ConnectionStrings__DefaultConnection` env vars in production.
- **Test logins (all `parola123`):** `test@carflow.ro` (Owner, "AutoTest Motors SRL"), `vanzator@test.ro` (Vanzari), `junior@test.ro` (Junior); second tenant `dealerb@test.ro` (Owner)

## Stack
- **Backend:** ASP.NET Core 9 Web API, EF Core + Npgsql, JWT + BCrypt, Swashbuckle
- **Frontend:** React + TypeScript + Vite, Tailwind v4 (via `@tailwindcss/vite`), @dnd-kit (kanban drag), axios, react-router
- **UI language: Romanian** (hardcoded labels, no i18n framework)
- Photos on local disk behind `IFileStorage` abstraction (`LocalDiskFileStorage` → `wwwroot/vehicles/{id}/`); swap to S3/R2 later without touching controllers. **URLs are HMAC-signed with an 8h expiry** (`PhotoUrlSigner`, key derived from `Jwt:Key`); a middleware ahead of `UseStaticFiles` 403s anything under `/vehicles/` without a valid `?e=&t=`. `<img>` can't send an Authorization header — hence the query-string signature. Signing happens at DTO exit (`VehiclesController` GetAll/GetById, `PhotosController` upload), never in SQL.

## Architecture — Multi-Tenancy (the load-bearing decision)
- Every tenant table implements `ITenantEntity { DealershipId }`
- JWT carries a `DealershipId` claim; scoped `TenantProvider` reads it from HttpContext
- **Global query filters** in `AppDbContext.OnModelCreating` scope every query to the current tenant; the `SaveChangesAsync(bool, ct)` / `SaveChanges(bool)` overrides auto-stamp `DealershipId` on inserts — controllers can't leak or forget it. Overriding *those* overloads (not `SaveChangesAsync(ct)`) is deliberate: every other path delegates into them. With no tenant in scope (`DealershipId == 0`) a pending tenant insert **throws** rather than writing an orphan row — there's no FK to `Dealerships` to catch it. Reads fail closed (`WHERE DealershipId = 0` matches nothing), which is why a background job that forgets `IgnoreQueryFilters()` silently returns empty instead of erroring.
- Every tenant table has a `DealershipId` index — that predicate is prepended to literally every query.
- `Users` table deliberately NOT filtered (login needs cross-tenant email lookup; email unique globally)
- Registration (wrapped in a **transaction** — otherwise a failed second save left an unreachable orphan Dealership) creates Dealership + Owner user + seeds 11 default stages: Cumpărată → Transport → Mecanică → Vopsitorie → Climă → Detailing → Listată → Gata de vânzare → Vânzare în curs → Vândută → Livrată, with per-stage `NotifyRole` pre-wired (junior stages → Junior, sales stages → Vanzari), `IsSaleReady` on "Gata de vânzare" and `IsSoldStage` on "Vândută". Owner edits stages at `/etape` (rename/reorder/add/delete; delete blocked if stage has vehicles or appears in history)

## Data Model (as built)
`Dealerships` (+ `DefaultStageAlertDays`=7, `StockAlertDays`=60 — alert thresholds, editable on `/etape`), `Users` (roles: **Owner/Vanzari/Junior** — no diacritics in claims; `IsActive` blocks login when false), `PipelineStages` (+ `AlertDays` per-stage stuck threshold, `NotifyRole`, `IsSaleReady`, `IsSoldStage` — at most one per dealer, enforced on write), `Vehicles` (+ `RARDate` and three reminder-dedup markers: `RARReminderSentFor`, `StuckReminderSentAt` — cleared on stage move, `StockAgingReminderSentAt`), `VehicleStatusHistory` (audit trail, drives days-in-stage AND the activity report), `VehicleCosts`, `VehiclePhotos`, `Sales`, **`Notifications`** (fan-out per recipient UserId; Type: StageMove/StuckInStage/StockAging/RAR/Document; IsRead), **`VehicleDocuments`** (per-vehicle checklist: Name, IsDone, DueDate?, ReminderSent)

### RBAC rules (dealer requirement: purchase price is Owner-only)
- `PurchasePrice` and `Profit` are `null` in every DTO for non-Owner (profit would reveal purchase price); non-Owner updates can't overwrite PurchasePrice (ignored server-side). Costs stay visible to all (juniors log them).
- The whole `Sale` block in `GET /api/vehicles/{id}` (price, buyer name/phone, financing) is Owner+Vanzari only — gating `GET /api/sales` alone left the same PII reachable via vehicle detail. Junior still sees `IsSold`.
- **JWT is revalidated against the DB on every request** (`JwtBearerEvents.OnTokenValidated`): deactivated account, changed role, or changed dealership → 401. Without it, a fired employee kept full access for the token's 24h lifetime.
- Stage moves: **all roles**, but never on a sold vehicle. Vehicle create/edit + sales: Owner+Vanzari. Vehicle delete, users, stages, settings, reports: Owner only. `GET /api/sales` is 403 for Junior — Dashboard skips the sales fetch and hides profit tiles for non-Owner.
- Stage move → notification to Owner + destination stage's `NotifyRole`, excluding the actor; note is included in the message (the "junior says car is ready" flow).
- `ReminderBackgroundService`: pass at startup +15s, then every 30 min. RAR ≤3 days → Owner+Junior (re-sends if date changes); unchecked document DueDate ≤3 days → Owner; days-in-stage ≥ (stage.AlertDays ?? dealer default) → Owner + stage NotifyRole; unsold vehicle in stock ≥ StockAlertDays → Owner+Vanzari. All queries `IgnoreQueryFilters()` (no HttpContext) with explicit DealershipId.
- **Dedup markers are set BEFORE `NotifyRolesAsync`**, which commits on the same DbContext — so marker and notifications land in one transaction. The reverse order re-sent every reminder after a mid-pass crash. `NotifyRolesAsync` always saves, even with zero recipients, so callers can rely on that commit.

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
- `GET /api/reports/activity?from=&to=` (Owner; per-user move counts + stage breakdown — each entry carries `stageId`, since every deleted stage renders as the same "Etapă ștearsă" label and can't be keyed by name)

## Frontend routes added in Etapa 2
`/utilizatori`, `/etape` (+ settings card), `/activitate` — Owner-only via `ProtectedRoute requiredRole`. Navbar shows links per role + `NotificationBell` (60s polling, unread badge, mark-read on click → navigates to LinkUrl). Board cards show RAR badge when ≤3 days away; VehicleDetail has "Acte" checklist section and RAR row; VehicleForm hides purchase price for non-Owner and has a RAR date field.

## Key Conventions & Rules
- **Profit = salePrice − purchasePrice − Σcosts** — always computed, never stored
- Sold vehicles cannot be deleted or moved between stages (financial history protection)
- **All stage moves go through `IVehicleStageService`** (`MoveAsync` + `NotifyMovedAsync`). Doing it by hand loses one of: the history row, the `StuckReminderSentAt` reset, or the notification — recording a sale used to skip the last two. Notify *after* commit so a failed move isn't announced.
- **Never look up a stage by name.** Stages are user-renamable; use `IsSoldStage` / `IsSaleReady`. Same rule on the frontend: Dashboard classifies by `sortOrder` relative to the first `IsSaleReady` stage, not by a hardcoded name list.
- `DateOnly` for cost/sale dates; all timestamps `DateTime.UtcNow` — including the reminder pass and report ranges. `DateTime.Now`/`DateTime.Today` anywhere makes behavior depend on server TZ.
- **Dates on the frontend:** `parseDateOnly()` for `DateOnly` strings (plain `new Date("2026-07-17")` is UTC-midnight rendered locally → off by a day), `todayIso()`/`toDateOnlyIso()` for defaults (`toISOString()` gives the UTC day → "yesterday" in Romania after midnight UTC). Both in `utils/format.ts`.
- **Numeric inputs**: empty field → `null`, never `Number("") === 0`. Clearing the purchase price to retype it used to silently save €0 and inflate that car's profit everywhere.
- Frontend auth: localStorage `carflow_token`/`carflow_user`; axios interceptor adds Bearer, redirects to /login on 401. `getUser()` swallows parse errors (it runs in render bodies — an exception there blanked the whole app); `ErrorBoundary` wraps the routes as a backstop.
- Board drag = optimistic update with rollback; days-in-stage badges: gray <3d, amber ≥3d, red ≥7d
- Frontend structure mirrors yoga project: `pages/`, `components/`, `services/`, `types/`, `utils/`; sub-components co-located in page files

## Gotchas
- `Microsoft.AspNetCore.OpenApi` package conflicts with Swashbuckle 10 (Microsoft.OpenApi type-load crash at startup) — keep it removed
- EF needs explicit `HasKey` for `StageId`/`HistoryId`/`CostId`/`PhotoId` (don't match `<ClassName>Id` convention)
- dotnet-ef tool v10 works fine against the net9.0 project
- `dotnet ef migrations add` fails while the API is running (the .exe is locked) — stop it first
- EF's generated `AddColumn` defaults to `false`/`0` regardless of the C# property initializer; fix the migration by hand when the default matters (e.g. `IsActive = true`, `DefaultStageAlertDays = 7`)
- Git repo initialized 2026-07-16. PG password + JWT key live in `dotnet user-secrets` (project `CarFlow.API`, not committed); `appsettings.json` only has `CHANGE_ME` placeholders, and startup now refuses to boot on them. Re-run the two `dotnet user-secrets set` commands on a fresh clone/machine.
- Browser-pane screenshots on this project intermittently time out; text tools (`get_page_text`, `javascript_tool`) are reliable and make better verification evidence anyway.

## Known technical debt (deliberately deferred in Etapa 3)
Reviewed and consciously left for later — none of it produces wrong data, it's cost and tidiness:
- **Perf:** `ReminderBackgroundService` loads every tenant's unsold vehicles as tracked entities every 30 min (threshold filtering happens client-side) and notifies N+1; `NotificationBell` polls 50 full notifications every 60s just to render a badge (wants a `/notifications/unread-count` endpoint + lazy list on open); `VehicleDetail` refetches the entire vehicle + stages on every checkbox tick instead of updating optimistically.
- **Duplication:** role strings are magic literals in ~25 places (a stray diacritic silently misroutes notifications) — wants a `Roles` constants class on the backend and named capabilities (`canSell()`) in `authService`; the 3/7-day badge thresholds are hardcoded in `Board`/`Vehicles`/`Dashboard` and contradict the backend's per-stage `AlertDays`; `invested`/profit math and its sign-based coloring are repeated 3–4× (wants a `<Profit>` component).

## Backlog (validate with dealers first)
- **Next (after seller meeting):** interested-clients (leads) DB — Make+Model required, engine/year/budget optional, phone, status (Cash/Credit aprobat/În așteptare) · auto-match when a vehicle enters an `IsSaleReady` stage → notify sellers + **wa.me link with prefilled Romanian message** (decided: manual send first — free, no Meta approval; Meta WhatsApp Business Cloud API evaluated later: needs verified business, template approval, ~€0.05/conversation) · lead follow-up reminders · sales statistics page (most-sold + fastest-sold makes, km/year range filters)
- Marketplace listings tracking (Autovit/Mobile.de/OLX) · VIN decode (NHTSA vPIC) · S3/R2 photo storage · docker-compose for demo deploys · email notifications (in-app only for now)

## Etapa 3 — security & correctness pass (2026-07-21)
A ten-angle code review of Etapa 2 surfaced ~30 issues; all were verified against the source before fixing. Fixed here: the placeholder JWT key becoming a production signing key, anonymous photo access, sale PII leaking to Juniors via vehicle detail, hardcoded API origin, tokens surviving deactivation/demotion, sold cars moving back through the pipeline, the name-based "Vândută" lookup silently no-oping after a rename, `Number("")` saving 0, corrupt localStorage white-screening the app, mixed local/UTC clocks (three distinct date bugs), non-transactional registration, reminder dedup ordering, Dashboard's dead stage-name list, duplicate React keys, culture-sensitive `double.Parse`, the bypassable `SaveChanges` override, and missing `DealershipId` indexes. Perf and duplication items were logged above instead. Verified E2E: signed URL 200 / tampered / unsigned / expired all 403; Owner vs Junior on the same vehicle URL; sold-move rejected; stage renamed → sale still routed by flag; deactivate + role-change → 401 on the existing token; tenant B still isolated; Production without secrets refuses to boot.

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
