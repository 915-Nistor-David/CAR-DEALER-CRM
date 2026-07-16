import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { vehicleService } from "../services/vehicleService";
import { assetUrl } from "../services/api";
import { formatKm, formatMoney } from "../utils/format";
import { getAvailableBrands, getModelsForBrand } from "../utils/carBrands";
import { useVehicleFilters } from "../hooks/useVehicleFilters";
import VehicleForm from "../components/VehicleForm";
import { Badge, Button, Card, Input, Select } from "../components/ui";
import type { Vehicle } from "../types";

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const { search, setSearch, brand, setBrand, model, setModel, filterVehicles } = useVehicleFilters();

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
        <Button onClick={() => setShowForm(true)}>+ Adaugă mașină</Button>
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
            <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-sm">
              <div className="text-4xl">🚗</div>
              <p className="mt-2 text-ink-secondary">
                {hasActiveFilters ? "Nicio mașină nu corespunde filtrelor." : "Nu ai încă nicio mașină în stoc."}
              </p>
              {!hasActiveFilters && (
                <Button onClick={() => setShowForm(true)} className="mt-4">
                  Adaugă prima mașină
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-alt text-xs uppercase text-ink-muted">
                  <tr>
                    <th className="px-4 py-3">Mașină</th>
                    <th className="px-4 py-3">An</th>
                    <th className="px-4 py-3">Km</th>
                    <th className="px-4 py-3">VIN</th>
                    <th className="px-4 py-3">Etapă</th>
                    <th className="px-4 py-3">Preț achiziție</th>
                    <th className="px-4 py-3">Costuri</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v) => (
                    <tr
                      key={v.vehicleId}
                      onClick={() => navigate(`/vehicles/${v.vehicleId}`)}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-alt"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {assetUrl(v.mainPhotoUrl) ? (
                            <img src={assetUrl(v.mainPhotoUrl)} alt=""
                              className="h-10 w-14 rounded object-cover" />
                          ) : (
                            <div className="flex h-10 w-14 items-center justify-center rounded bg-surface-alt">🚗</div>
                          )}
                          <span className="font-medium text-ink">{v.make} {v.model}</span>
                          {v.isSold && <Badge tone="good">Vândută</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-secondary">{v.year}</td>
                      <td className="px-4 py-3 text-ink-secondary">{formatKm(v.km)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">{v.vin || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge tone="info">{v.currentStageName}</Badge>
                      </td>
                      <td className="px-4 py-3 text-ink-secondary">{formatMoney(v.purchasePrice)}</td>
                      <td className="px-4 py-3 text-ink-secondary">{formatMoney(v.totalCosts)}</td>
                      <td className="px-4 py-3 text-right text-accent">Detalii →</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
