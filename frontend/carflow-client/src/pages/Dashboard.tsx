import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { vehicleService } from "../services/vehicleService";
import { saleService } from "../services/saleService";
import { assetUrl } from "../services/api";
import { formatDate, formatMoney, parseDateOnly } from "../utils/format";
import { authService } from "../services/authService";
import StatTile from "../components/StatTile";
import RingChart from "../components/charts/RingChart";
import AreaChart, { type AreaPoint } from "../components/charts/AreaChart";
import { CarIcon, ClockIcon, EuroIcon, TagIcon } from "../components/icons";
import { Card } from "../components/ui";
import type { SaleListItem, Stage, Vehicle } from "../types";

const sameMonth = (iso: string, ref: Date) => {
  const d = parseDateOnly(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
};

// Clasificam dupa pozitia in pipeline, nu dupa nume: etapele sunt configurabile
// din /etape, deci orice lista de nume hardcodata se rupe la prima redenumire.
// "Pregatire" = tot ce e inainte de prima etapa marcata "gata de vanzare".
function splitByReadiness(vehicles: Vehicle[], stages: Stage[]) {
  const orderById = new Map(stages.map((s) => [s.stageId, s.sortOrder]));
  const saleReadyOrder = stages.find((s) => s.isSaleReady)?.sortOrder ?? Infinity;

  let prep = 0;
  let forSale = 0;
  for (const v of vehicles) {
    const order = orderById.get(v.currentStageId);
    if (order == null) continue;
    if (order < saleReadyOrder) prep++;
    else forSale++;
  }
  return { prep, forSale, other: vehicles.length - prep - forSale };
}

// ultimele N luni ca puncte { label: "iul.", value }, insumand profitul vanzarilor
function monthlyProfit(sales: SaleListItem[], months = 6): AreaPoint[] {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const ref = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const value = sales
      .filter((s) => sameMonth(s.saleDate, ref))
      .reduce((sum, s) => sum + (s.profit ?? 0), 0);
    const label = ref.toLocaleDateString("ro-RO", { month: "short" });
    return { label, value };
  });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const user = authService.getUser();
  // Junior nu are acces la vanzari; profitul e doar pentru Owner
  const isOwner = authService.isOwner();
  const canSeeSales = authService.hasRole("Owner", "Vanzari");

  useEffect(() => {
    (async () => {
      try {
        const [v, s, st] = await Promise.all([
          vehicleService.getAll(),
          canSeeSales ? saleService.getAll() : Promise.resolve([]),
          vehicleService.getStages(),
        ]);
        setVehicles(v);
        setSales(s);
        setStages(st);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-ink-secondary">Se încarcă dashboard-ul...</p>;

  const active = vehicles.filter((v) => !v.isSold);
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const soldThisMonth = sales.filter((s) => sameMonth(s.saleDate, now)).length;
  const soldLastMonth = sales.filter((s) => sameMonth(s.saleDate, lastMonth)).length;
  const soldDiff = soldThisMonth - soldLastMonth;

  const profitThisMonth = sales
    .filter((s) => sameMonth(s.saleDate, now))
    .reduce((sum, s) => sum + (s.profit ?? 0), 0);
  const profitLastMonth = sales
    .filter((s) => sameMonth(s.saleDate, lastMonth))
    .reduce((sum, s) => sum + (s.profit ?? 0), 0);
  const profitDiff = profitThisMonth - profitLastMonth;

  const totalProfit = sales.reduce((sum, s) => sum + (s.profit ?? 0), 0);
  const avgDaysInStage = active.length
    ? Math.round(active.reduce((sum, v) => sum + v.daysInStage, 0) / active.length)
    : 0;

  const addedThisMonth = vehicles.filter((v) => sameMonth(v.createdAt, now)).length;

  const readiness = splitByReadiness(active, stages);

  const stageSegments = [
    { label: "Pregătire", value: readiness.prep, color: "var(--color-accent)" },
    { label: "De vânzare", value: readiness.forSale, color: "var(--color-good)" },
    { label: "Alte etape", value: readiness.other, color: "var(--color-ink-muted)" },
  ].filter((s) => s.value > 0);

  const healthSegments = [
    { label: "Recent mutate", value: active.filter((v) => v.daysInStage < 3).length, color: "var(--color-good)" },
    { label: "De urmărit", value: active.filter((v) => v.daysInStage >= 3 && v.daysInStage < 7).length, color: "var(--color-warning)" },
    { label: "Blocate", value: active.filter((v) => v.daysInStage >= 7).length, color: "var(--color-critical)" },
  ];
  const healthTotal = healthSegments.reduce((sum, s) => sum + s.value, 0);

  const chartData = monthlyProfit(sales);
  const recent = vehicles.slice(0, 5);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Bun venit{user ? `, ${user.name}` : ""}</h1>
        <p className="text-sm text-ink-secondary">
          {user?.dealershipName ? `${user.dealershipName} · ` : ""}o privire de ansamblu asupra stocului tău.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<CarIcon size={18} />}
          label="Mașini în stoc"
          value={active.length}
          tone="accent"
          delta={addedThisMonth > 0 ? `+${addedThisMonth} adăugate luna aceasta` : "nicio intrare luna aceasta"}
          deltaTone={addedThisMonth > 0 ? "good" : "neutral"}
        />
        {canSeeSales && (
          <StatTile
            icon={<TagIcon size={18} />}
            label="Vândute luna aceasta"
            value={soldThisMonth}
            tone="good"
            delta={
              soldDiff === 0
                ? "la fel ca luna trecută"
                : `${soldDiff > 0 ? "+" : ""}${soldDiff} față de luna trecută`
            }
            deltaTone={soldDiff > 0 ? "good" : soldDiff < 0 ? "critical" : "neutral"}
          />
        )}
        {isOwner && (
          <StatTile
            icon={<EuroIcon size={18} />}
            label="Profit total"
            value={formatMoney(totalProfit)}
            tone={totalProfit >= 0 ? "good" : "critical"}
            delta={
              profitDiff === 0
                ? "la fel ca luna trecută"
                : `${profitDiff > 0 ? "+" : "−"}${formatMoney(Math.abs(profitDiff))} față de luna trecută`
            }
            deltaTone={profitDiff > 0 ? "good" : profitDiff < 0 ? "critical" : "neutral"}
          />
        )}
        <StatTile
          icon={<ClockIcon size={18} />}
          label="Zile medii în etapă"
          value={avgDaysInStage}
          tone="warning"
          delta="pe mașinile active din stoc"
          deltaTone="neutral"
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {isOwner && (
          <Card className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink">Profit pe lună</h2>
                <p className="text-xs text-ink-muted">ultimele 6 luni, din vânzările înregistrate</p>
              </div>
              <span className="rounded-full border border-border px-3 py-1 text-xs text-ink-secondary">
                {formatMoney(totalProfit)} total
              </span>
            </div>
            <AreaChart data={chartData} formatValue={(v) => formatMoney(v)} />
          </Card>
        )}
        <Card className={isOwner ? "" : "lg:col-span-3"}>
          <h2 className="mb-3 text-base font-bold text-ink">Stoc pe etape</h2>
          {active.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">Niciun vehicul activ în stoc.</p>
          ) : (
            <RingChart segments={stageSegments} centerValue={active.length} centerLabel="active" />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-base font-bold text-ink">Sănătatea stocului</h2>
          <p className="mb-4 text-xs text-ink-muted">după timpul petrecut în etapa curentă</p>
          {healthTotal === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">Niciun vehicul activ în stoc.</p>
          ) : (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-alt">
                {healthSegments
                  .filter((s) => s.value > 0)
                  .map((s) => (
                    <div
                      key={s.label}
                      className="h-full"
                      style={{ width: `${(s.value / healthTotal) * 100}%`, backgroundColor: s.color }}
                      title={`${s.label}: ${s.value}`}
                    />
                  ))}
              </div>
              <div className="mt-4 space-y-2.5">
                {healthSegments.map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-ink-secondary">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </span>
                    <span className="font-semibold text-ink">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-base font-bold text-ink">Adăugate recent</h2>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">Nu ai încă nicio mașină în stoc.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {recent.map((v) => (
                <div
                  key={v.vehicleId}
                  onClick={() => navigate(`/vehicles/${v.vehicleId}`)}
                  className="flex cursor-pointer items-center gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80"
                >
                  {assetUrl(v.mainPhotoUrl) ? (
                    <img src={assetUrl(v.mainPhotoUrl)} alt="" className="h-10 w-14 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-surface-alt text-ink-muted">
                      <CarIcon size={16} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{v.make} {v.model}</p>
                    <p className="text-xs text-ink-muted">{v.currentStageName} · adăugată {formatDate(v.createdAt)}</p>
                  </div>
                  {v.purchasePrice != null && (
                    <span className="shrink-0 text-sm font-medium text-accent-hover">{formatMoney(v.purchasePrice)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
