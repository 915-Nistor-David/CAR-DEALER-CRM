import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { vehicleService } from "../services/vehicleService";
import { saleService } from "../services/saleService";
import { assetUrl } from "../services/api";
import { formatDate, formatMoney } from "../utils/format";
import { authService } from "../services/authService";
import StatTile from "../components/StatTile";
import RingChart from "../components/charts/RingChart";
import { Card } from "../components/ui";
import type { SaleListItem, Vehicle } from "../types";

const PREP_STAGES = new Set(["Cumpărată", "Transport", "Service", "Inspecție", "Detailing"]);
const FOR_SALE_STAGES = new Set(["Listată", "Gata de vânzare", "Vânzare în curs"]);

export default function Dashboard() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const user = authService.getUser();

  useEffect(() => {
    (async () => {
      try {
        const [v, s] = await Promise.all([vehicleService.getAll(), saleService.getAll()]);
        setVehicles(v);
        setSales(s);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-ink-secondary">Se încarcă dashboard-ul...</p>;

  const active = vehicles.filter((v) => !v.isSold);
  const now = new Date();
  const soldThisMonth = sales.filter((s) => {
    const d = new Date(s.saleDate);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
  const avgDaysInStage = active.length
    ? Math.round(active.reduce((sum, v) => sum + v.daysInStage, 0) / active.length)
    : 0;

  const prepCount = active.filter((v) => PREP_STAGES.has(v.currentStageName)).length;
  const forSaleCount = active.filter((v) => FOR_SALE_STAGES.has(v.currentStageName)).length;
  const otherCount = active.length - prepCount - forSaleCount;

  const stageSegments = [
    { label: "Pregătire", value: prepCount, color: "var(--color-accent)" },
    { label: "De vânzare", value: forSaleCount, color: "var(--color-good)" },
    { label: "Alte etape", value: otherCount, color: "var(--color-ink-muted)" },
  ].filter((s) => s.value > 0);

  const healthyCount = active.filter((v) => v.daysInStage < 3).length;
  const watchCount = active.filter((v) => v.daysInStage >= 3 && v.daysInStage < 7).length;
  const staleCount = active.filter((v) => v.daysInStage >= 7).length;

  const healthSegments = [
    { label: "Sănătoase", value: healthyCount, color: "var(--color-good)" },
    { label: "De urmărit", value: watchCount, color: "var(--color-warning)" },
    { label: "Blocate", value: staleCount, color: "var(--color-critical)" },
  ].filter((s) => s.value > 0);

  const recent = vehicles.slice(0, 5);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Bun venit{user ? `, ${user.name}` : ""}</h1>
        <p className="text-sm text-ink-secondary">
          {user?.dealershipName ? `${user.dealershipName} · ` : ""}o privire de ansamblu asupra stocului tău.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon="🚗" label="Mașini în stoc" value={active.length} tone="accent" />
        <StatTile icon="💰" label="Vândute luna aceasta" value={soldThisMonth} tone="good" />
        <StatTile
          icon="📈"
          label="Profit total"
          value={formatMoney(totalProfit)}
          tone={totalProfit >= 0 ? "good" : "critical"}
        />
        <StatTile icon="⏱️" label="Zile medii în etapă" value={avgDaysInStage} tone="warning" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-base font-bold text-ink">Stoc pe etape</h2>
          {active.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">Niciun vehicul activ în stoc.</p>
          ) : (
            <RingChart segments={stageSegments} centerValue={active.length} centerLabel="active" />
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-base font-bold text-ink">Sănătatea stocului</h2>
          {active.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">Niciun vehicul activ în stoc.</p>
          ) : (
            <RingChart segments={healthSegments} centerValue={active.length} centerLabel="active" />
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-base font-bold text-ink">Adăugate recent</h2>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">Nu ai încă nicio mașină în stoc.</p>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((v) => (
              <div
                key={v.vehicleId}
                onClick={() => navigate(`/vehicles/${v.vehicleId}`)}
                className="flex cursor-pointer items-center gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80"
              >
                {assetUrl(v.mainPhotoUrl) ? (
                  <img src={assetUrl(v.mainPhotoUrl)} alt="" className="h-10 w-14 rounded object-cover" />
                ) : (
                  <div className="flex h-10 w-14 items-center justify-center rounded bg-surface-alt">🚗</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{v.make} {v.model}</p>
                  <p className="text-xs text-ink-muted">{v.currentStageName} · adăugată {formatDate(v.createdAt)}</p>
                </div>
                <span className="shrink-0 text-sm text-ink-secondary">{formatMoney(v.purchasePrice)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
