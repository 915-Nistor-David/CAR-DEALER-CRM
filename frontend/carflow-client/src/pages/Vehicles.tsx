import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { vehicleService } from "../services/vehicleService";
import { assetUrl } from "../services/api";
import { daysLabel, formatKm, formatMoney } from "../utils/format";
import { getAvailableBrands, getModelsForBrand } from "../utils/carBrands";
import { useVehicleFilters } from "../hooks/useVehicleFilters";
import VehicleForm from "../components/VehicleForm";
import { CarIcon } from "../components/icons";
import { Badge, Button, Card, Input, Select } from "../components/ui";
import { authService } from "../services/authService";
import type { Vehicle } from "../types";

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { search, setSearch, brand, setBrand, model, setModel, filterVehicles } = useVehicleFilters();

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
    // preluam cautarea din bara de navigare doar la sosirea pe pagina
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const load = async () => {
    try {
      setVehicles(await vehicleService.getAll());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = filterVehicles(vehicles);
  const availableBrands = getAvailableBrands(vehicles);
  const availableModels = getModelsForBrand(vehicles, brand || null);
  const hasActiveFilters = !!(search || brand || model);

  const resetFilters = () => {
    setSearch("");
    setBrand("");
  };

  if (loading) return <p className="text-ink-secondary">Se încarcă mașinile...</p>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Mașini în stoc</h1>
          <p className="text-sm text-ink-secondary">
            {hasActiveFilters ? `${filtered.length} mașini găsite din ${vehicles.length}` : `${vehicles.length} mașini în total`}
          </p>
        </div>
        {authService.hasRole("Owner", "Vanzari") && (
          <Button onClick={() => setShowForm(true)}>+ Adaugă mașină</Button>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56">
          <Card className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-secondary">Marcă</label>
              <Select value={brand} onChange={(e) => setBrand(e.target.value)}>
                <option value="">Toate mărcile</option>
                {availableBrands.map((b) => <option key={b} value={b}>{b}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-secondary">Model</label>
              <Select value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="">Toate modelele</option>
                {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-secondary">Marcă, model sau VIN</label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Caută..."
              />
            </div>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="text-xs font-medium text-accent hover:underline">
                Resetează filtrele
              </button>
            )}
          </Card>
        </aside>

        <div className="min-w-0 flex-1">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent-hover">
                <CarIcon size={26} />
              </div>
              <p className="mt-2 text-ink-secondary">
                {hasActiveFilters ? "Nicio mașină nu corespunde filtrelor." : "Nu ai încă nicio mașină în stoc."}
              </p>
              {!hasActiveFilters && authService.hasRole("Owner", "Vanzari") && (
                <Button onClick={() => setShowForm(true)} className="mt-4">
                  Adaugă prima mașină
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((v) => (
                <VehicleGridCard key={v.vehicleId} vehicle={v} onClick={() => navigate(`/vehicles/${v.vehicleId}`)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <VehicleForm
          onClose={() => setShowForm(false)}
          onSaved={(id) => { setShowForm(false); navigate(`/vehicles/${id}`); }}
        />
      )}
    </div>
  );
}

function VehicleGridCard({ vehicle: v, onClick }: { vehicle: Vehicle; onClick: () => void }) {
  const photo = assetUrl(v.mainPhotoUrl);

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all hover:border-accent/40 hover:shadow-[0_8px_30px_-8px_rgba(124,90,255,0.35)]"
    >
      <div className="relative h-40 w-full">
        {photo ? (
          <img
            src={photo}
            alt={`${v.make} ${v.model}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-alt to-surface-hover text-ink-muted">
            <CarIcon size={40} />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          {v.currentStageName}
        </span>
        {v.isSold && (
          <span className="absolute right-2 top-2 rounded-full bg-good/90 px-2.5 py-0.5 text-[11px] font-semibold text-white">
            Vândută
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="truncate text-base font-semibold text-ink">{v.make} {v.model}</p>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {v.year} · {formatKm(v.km)}{v.vin ? ` · ${v.vin}` : ""}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-accent-hover">
            {v.purchasePrice != null ? formatMoney(v.purchasePrice) : ""}
          </span>
          {!v.isSold && (
            <Badge tone={v.daysInStage >= 7 ? "critical" : v.daysInStage >= 3 ? "warning" : "neutral"}>
              {daysLabel(v.daysInStage)} în etapă
            </Badge>
          )}
        </div>
        {v.totalCosts > 0 && (
          <p className="mt-1.5 text-xs text-ink-muted">+ {formatMoney(v.totalCosts)} costuri</p>
        )}
      </div>
    </div>
  );
}
