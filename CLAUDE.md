# CarFlow — Vehicle Pipeline CRM for Used Car Dealers

## What This Is
Commercial SaaS product (to be sold to real dealers, not a school project). Tracks each car from purchase to delivery on a kanban pipeline — the car's lifecycle is the product, unlike generic CRMs that track customers. Solo developer (David), also building YogaStudioManagement (thesis).

**Status: Etapa 4 (notifications, agenda, UI fixes) done 2026-07-21**, on top of Etapa 3 (security + correctness hardening, same day). Etapa 2 (2026-07-18) built RBAC (Owner/Vanzari/Junior), granular pipeline stages, in-app notifications, reminders (RAR/documents/stuck-in-stage/stock-aging), vehicle documents checklist, employee activity report — all from the first dealer interview (log below). **Deferred until the seller-team meeting:** interested-clients (leads) database + auto-matching + wa.me message links; sales statistics page. Pricing question still open.

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
- **Notification types and categories live in `Common/NotificationTypes.cs`** — never write the type string inline. Category is **derived** from type (no DB column), so regrouping needs no migration: **Pipeline** (StageMove) · **Bani** (Sale, Cost) · **Urgente** (StuckInStage, StockAging, RAR, Document). The frontend mirror is `NOTIFICATION_CATEGORIES` / `NOTIFICATION_TYPE_LABELS` in `types/index.ts` — keep them in sync.
- **A sale sends its own `Sale` notification** from `SalesController`, separate from the stage-move echo, and **without `excludeUserId`** — the owner wants confirmation of a financial event even when they recorded it themselves (previously a single-owner dealership got nothing at all). Profit only goes in the Owner's copy; `Vanzari` gets the same notification minus the profit line, via a second `NotifyRolesAsync` call.
- **Costs notify the Owner** on add *and* delete (`CostsController`), excluding the actor. All roles may log costs, so this is the owner's only visibility into money being spent.
- **Dedup markers are set BEFORE `NotifyRolesAsync`**, which commits on the same DbContext — so marker and notifications land in one transaction. The reverse order re-sent every reminder after a mid-pass crash. `NotifyRolesAsync` always saves, even with zero recipients, so callers can rely on that commit.

## API Surface
- `POST /api/auth/register|login` (login 401 if `IsActive=false`)
- `GET|POST|PUT|DELETE /api/stages[/{id}]` + `PUT /api/stages/reorder` (writes Owner-only)
- `GET|POST|PUT|DELETE /api/vehicles`, `GET /api/vehicles/{id}` (detail incl. photos/costs/history/documents/sale/profit), `PUT /api/vehicles/{id}/stage` (history row + notification + clears stuck marker)
- `POST|DELETE /api/vehicles/{id}/costs[/{costId}]`, `POST|DELETE /api/vehicles/{id}/photos[/{photoId}]`
- `POST|PUT|DELETE /api/vehicles/{id}/documents[/{docId}]` (checklist; DueDate change resets ReminderSent)
- `POST /api/vehicles/{id}/sale`, `GET /api/sales`, `PUT /api/sales/{id}/checklist` (all Owner+Vanzari)
- `GET /api/notifications?category=&type=&unreadOnly=&from=&to=&skip=&take=` → `{ unreadCount, unreadByCategory, total, items }`; `PUT /api/notifications/{id}/read`, `PUT /api/notifications/read-all?category=`
- `GET /api/agenda?from=&to=` — everything with a deadline, unified (see Agenda below)
- `GET|POST|PUT /api/users[/{id}]` (Owner; self-demote/deactivate blocked)
- `GET|PUT /api/settings` (alert thresholds; PUT Owner)
- `GET /api/reports/activity?from=&to=` (Owner; per-user move counts + stage breakdown — each entry carries `stageId`, since every deleted stage renders as the same "Etapă ștearsă" label and can't be keyed by name)

## Agenda (`/agenda`) — step 1 toward replacing the dealer's Trello
There is **no task/assignee model** (deliberately — see Backlog). The agenda unifies the deadline-shaped data that already exists: `Vehicle.RARDate`, `VehicleDocument.DueDate`, and the two computed thresholds. For the threshold kinds the displayed date is **when the car crosses the limit** (`enteredStageAt + AlertDays`, `createdAt + StockAlertDays`), not when it entered — that is what makes them land sensibly on a calendar.

- Threshold math lives in `Common/AlertRules.cs`, **shared with `ReminderBackgroundService`** so the calendar and the notifications can't disagree about the same car.
- Each role sees exactly what it would be *notified* about: RAR → Owner+Junior, Document → Owner, StuckInStage → Owner + the stage's `NotifyRole`, StockAging → Owner+Vanzari.
- Frontend `pages/Agenda.tsx`: month grid built by hand (no date library, Monday-first) + "Restante și următoarele 7 zile" list; overdue entries ringed/red.

## Frontend routes added in Etapa 2
`/utilizatori`, `/etape` (+ settings card), `/activitate` — Owner-only via `ProtectedRoute requiredRole`. Navbar shows links per role + `NotificationBell` (60s polling, unread badge, mark-read on click → navigates to LinkUrl). Board cards show RAR badge when ≤3 days away; VehicleDetail has "Acte" checklist section and RAR row; VehicleForm hides purchase price for non-Owner and has a RAR date field.

## Key Conventions & Rules
- **Profit = salePrice − purchasePrice − Σcosts** — always computed, never stored
- Sold vehicles cannot be deleted or moved between stages (financial history protection)
- **All stage moves go through `IVehicleStageService`** (`MoveAsync` + `NotifyMovedAsync`). Doing it by hand loses one of: the history row, the `StuckReminderSentAt` reset, or the notification — recording a sale used to skip the last two. Notify *after* commit so a failed move isn't announced.
- **Never look up a stage by name.** Stages are user-renamable; use `IsSoldStage` / `IsSaleReady`. Same rule on the frontend: Dashboard classifies by `sortOrder` relative to the first `IsSaleReady` stage, not by a hardcoded name list.
- `DateOnly` for cost/sale dates; all timestamps `DateTime.UtcNow` — including the reminder pass and report ranges. `DateTime.Now`/`DateTime.Today` anywhere makes behavior depend on server TZ.
- **Dates on the frontend:** `parseDateOnly()` for `DateOnly` strings (plain `new Date("2026-07-17")` is UTC-midnight rendered locally → off by a day), `todayIso()`/`toDateOnlyIso()` for defaults (`toISOString()` gives the UTC day → "yesterday" in Romania after midnight UTC). Both in `utils/format.ts`.
- **Numeric inputs**: empty field → `null`, never `Number("") === 0`, and no `0` prefilled either — a prefilled 0 forces the user to select-and-delete, and typing without selecting appends (`5` → `05000`). `year`/`km`/`purchasePrice` all start empty and are validated on submit.
- **Grid/flex children that must clip need `min-w-0`** — the default `min-width: auto` makes them grow to fit content instead. This silently gave `/vehicles/:id` a horizontally scrolling page and stopped the photo strips from ever scrolling.
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
- **Perf:** `ReminderBackgroundService` loads every tenant's unsold vehicles as tracked entities every 30 min (threshold filtering happens client-side) and notifies N+1; `NotificationBell` polls 20 full notifications every 60s just to render a badge (wants a `/notifications/unread-count` endpoint + lazy list on open); `VehicleDetail` refetches the entire vehicle + stages on every checkbox tick instead of updating optimistically. `AgendaController` materialises all unsold vehicles per request.
- **Duplication:** role strings are magic literals in ~25 places (a stray diacritic silently misroutes notifications) — wants a `Roles` constants class on the backend and named capabilities (`canSell()`) in `authService`; the 3/7-day badge thresholds are hardcoded in `Board`/`Vehicles`/`Dashboard` and contradict the backend's per-stage `AlertDays`; `invested`/profit math and its sign-based coloring are repeated 3–4× (wants a `<Profit>` component).

## Backlog (validate with dealers first)
- **Next (after seller meeting):** interested-clients (leads) DB — Make+Model required, engine/year/budget optional, phone, status (Cash/Credit aprobat/În așteptare) · auto-match when a vehicle enters an `IsSaleReady` stage → notify sellers + **wa.me link with prefilled Romanian message** (decided: manual send first — free, no Meta approval; Meta WhatsApp Business Cloud API evaluated later: needs verified business, template approval, ~€0.05/conversation) · lead follow-up reminders · sales statistics page (most-sold + fastest-sold makes, km/year range filters)
- Marketplace listings tracking (Autovit/Mobile.de/OLX) · VIN decode (NHTSA vPIC) · S3/R2 photo storage · docker-compose for demo deploys · email notifications (in-app only for now)

## Etapa 3 — security & correctness pass (2026-07-21)
A ten-angle code review of Etapa 2 surfaced ~30 issues; all were verified against the source before fixing. Fixed here: the placeholder JWT key becoming a production signing key, anonymous photo access, sale PII leaking to Juniors via vehicle detail, hardcoded API origin, tokens surviving deactivation/demotion, sold cars moving back through the pipeline, the name-based "Vândută" lookup silently no-oping after a rename, `Number("")` saving 0, corrupt localStorage white-screening the app, mixed local/UTC clocks (three distinct date bugs), non-transactional registration, reminder dedup ordering, Dashboard's dead stage-name list, duplicate React keys, culture-sensitive `double.Parse`, the bypassable `SaveChanges` override, and missing `DealershipId` indexes. Perf and duplication items were logged above instead. Verified E2E: signed URL 200 / tampered / unsigned / expired all 403; Owner vs Junior on the same vehicle URL; sold-move rejected; stage renamed → sale still routed by flag; deactivate + role-change → 401 on the existing token; tenant B still isolated; Production without secrets refuses to boot.

## Etapa 4 — notifications, agenda, UI fixes (2026-07-21)
From David's own use of the app plus the dealer's follow-up notes. Built: dedicated sale notification (the dealer's complaint was worse than reported — an owner recording their own sale got *nothing*, and the generic text carried no price, buyer or profit); cost notifications on add/delete; notification categories + tabs in the bell + a full `/notificari` page with type/date/unread filters; `/agenda`; photos grouped into Exterior/Interior/Defecte horizontal strips with arrows and always-visible delete (was hover-only → unusable on the service tablets); `scrollIntoView` when editing a stage; `km` no longer prefills 0.

Verified via API: owner selling their own car now gets a Sale notification with correct profit (16.900 − 13.200 − 900 = 2.800 €); `Vanzari` gets the same notification without the profit line; a Junior's 450 € cost reaches the Owner while the Owner's own cost does not self-notify; category counts partition exactly (6 Pipeline + 2 Bani + 4 Urgente = 12 total); invalid category → 400; pagination works; agenda returns all four kinds with correct overdue flags, and a Junior sees only RAR. Verified in the DOM: three photo sections with counts, three strips, delete buttons not hover-gated; agenda calendar + list render; notification tabs filter correctly.
**Not verified:** the physical arrow-click scroll on a photo strip — the browser pane collapsed to width 0 mid-session (known flakiness). The conditional rendering *was* confirmed (arrow appears at 167px visible / 1192px content, absent at 504/504); only the `scrollBy` gesture is untested.

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

### 2026-07-20 — David's own notes + dealer follow-up (built in Etapa 4)
1. ✅ Photos grouped by Exterior/Interior/Defecte with a scrollable strip instead of one flat grid.
2. ✅ Clicking "Editează" on a stage now scrolls to the form (it renders above the list, so nothing appeared to happen).
3. ⏳ **Admin uses Trello for team tasks** — wants a calendar/task view. Step 1 (`/agenda`, read-only from existing deadlines) shipped; assignable tasks deferred to after the sellers' meeting, since sellers will have opinions about what a task looks like.
4. ✅ Dealer wasn't notified when a car was sold.
5. ✅ Notifications when someone (esp. a junior) logs a cost.
6. ✅ Grouped notifications — dealer asked for "cât mai multe filtre/informații legat de activitate": categories Pipeline / Bani / Urgente, plus a filterable notifications page.
7. ✅ `km` and purchase price no longer prefill `0` (you had to select-all before typing, else the digits appended to the 0).
