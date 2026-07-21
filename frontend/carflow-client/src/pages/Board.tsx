import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { vehicleService } from "../services/vehicleService";
import { assetUrl } from "../services/api";
import { formatMoney, formatKm, daysLabel, daysUntil } from "../utils/format";
import { CarIcon } from "../components/icons";
import { getAvailableBrands, getModelsForBrand } from "../utils/carBrands";
import { useVehicleFilters } from "../hooks/useVehicleFilters";
import VehicleForm from "../components/VehicleForm";
import { Badge, Button, Input, Select } from "../components/ui";
import { authService } from "../services/authService";
import type { Stage, Vehicle } from "../types";

export default function Board() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const justDragged = useRef(false);
  const navigate = useNavigate();
  // Juniorii nu mai muta masinile intre etape (backendul respinge oricum);
  // pentru ei board-ul e doar de citit, cu click pe card catre detaliu.
  const canMove = authService.hasRole("Owner", "Vanzari");
  const { search, setSearch, brand, setBrand, model, setModel, filterVehicles } = useVehicleFilters();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const load = async () => {
    try {
      const [s, v] = await Promise.all([vehicleService.getStages(), vehicleService.getAll()]);
      setStages(s);
      setVehicles(v);
      setError("");
    } catch {
      setError("Nu s-au putut încărca datele. Verifică dacă serverul rulează.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDragStart = (_e: DragStartEvent) => {
    justDragged.current = true;
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setTimeout(() => { justDragged.current = false; }, 100);
    const { active, over } = e;
    if (!over) return;

    const vehicleId = Number(String(active.id).replace("vehicle-", ""));
    const stageId = Number(String(over.id).replace("stage-", ""));
    const vehicle = vehicles.find((v) => v.vehicleId === vehicleId);
    const stage = stages.find((s) => s.stageId === stageId);
    if (!vehicle || !stage || vehicle.currentStageId === stageId) return;

    // update optimist — mutam cardul imediat, revenim daca API-ul esueaza
    const previous = vehicles;
    setVehicles((list) =>
      list.map((v) =>
        v.vehicleId === vehicleId
          ? { ...v, currentStageId: stageId, currentStageName: stage.name, daysInStage: 0 }
          : v
      )
    );
    try {
      await vehicleService.changeStage(vehicleId, stageId);
    } catch (err: any) {
      setVehicles(previous);
      setError(err.response?.data?.message ?? "Mutarea a eșuat.");
      setTimeout(() => setError(""), 4000);
    }
  };

  const handleCardClick = (vehicleId: number) => {
    if (justDragged.current) return;
    navigate(`/vehicles/${vehicleId}`);
  };

  if (loading) return <p className="text-ink-secondary">Se încarcă board-ul...</p>;

  const filtered = filterVehicles(vehicles);
  const availableBrands = getAvailableBrands(vehicles);
  const availableModels = getModelsForBrand(vehicles, brand || null);
  const hasActiveFilters = !!(search || brand || model);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Pipeline</h1>
          <p className="text-sm text-ink-secondary">
            {canMove
              ? "Trage o mașină în altă coloană pentru a-i schimba etapa."
              : "Click pe o mașină pentru detalii. Mutarea între etape o fac patronul și echipa de vânzări."}
          </p>
        </div>
        {authService.hasRole("Owner", "Vanzari") && (
          <Button onClick={() => setShowForm(true)}>+ Adaugă mașină</Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={brand} onChange={(e) => setBrand(e.target.value)} className="w-auto min-w-36">
          <option value="">Toate mărcile</option>
          {availableBrands.map((b) => <option key={b} value={b}>{b}</option>)}
        </Select>
        <Select value={model} onChange={(e) => setModel(e.target.value)} className="w-auto min-w-36">
          <option value="">Toate modelele</option>
          {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
        </Select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Marcă, model sau VIN..."
          className="w-56"
        />
        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(""); setBrand(""); }}
            className="text-xs font-medium text-accent hover:underline"
          >
            Resetează filtrele
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-critical/15 px-4 py-3 text-sm text-critical">{error}</div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <StageColumn
              key={stage.stageId}
              stage={stage}
              vehicles={filtered.filter((v) => v.currentStageId === stage.stageId)}
              onCardClick={handleCardClick}
              canMove={canMove}
            />
          ))}
        </div>
      </DndContext>

      {showForm && (
        <VehicleForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function StageColumn({ stage, vehicles, onCardClick, canMove }: {
  stage: Stage;
  vehicles: Vehicle[];
  onCardClick: (id: number) => void;
  canMove: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage-${stage.stageId}` });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col rounded-xl border p-2 transition-colors ${
        isOver ? "border-accent/60 bg-accent/10 ring-2 ring-accent" : "border-border/60 bg-surface-alt/60"
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-ink-secondary">{stage.name}</h2>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-secondary">
          {vehicles.length}
        </span>
      </div>
      <div className="flex min-h-24 flex-col gap-2">
        {vehicles.map((v) => (
          <VehicleCard key={v.vehicleId} vehicle={v} onClick={() => onCardClick(v.vehicleId)}
            canMove={canMove} />
        ))}
      </div>
    </div>
  );
}

function VehicleCard({ vehicle, onClick, canMove }: {
  vehicle: Vehicle; onClick: () => void; canMove: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `vehicle-${vehicle.vehicleId}`,
    disabled: !canMove,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined;

  const photo = assetUrl(vehicle.mainPhotoUrl);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`rounded-xl border border-border bg-surface p-2 shadow-sm transition-all hover:border-accent/40 hover:shadow-[0_8px_30px_-8px_rgba(124,90,255,0.35)] ${
        canMove ? "cursor-grab" : "cursor-pointer"
      } ${isDragging ? "opacity-70 shadow-lg" : ""}`}
    >
      {photo ? (
        <img src={photo} alt="" className="mb-2 h-24 w-full rounded-lg object-cover" />
      ) : (
        <div className="mb-2 flex h-24 w-full items-center justify-center rounded-lg bg-gradient-to-br from-surface-alt to-surface-hover text-ink-muted">
          <CarIcon size={28} />
        </div>
      )}
      <div className="px-1 pb-1">
        <p className="truncate text-sm font-semibold text-ink">
          {vehicle.make} {vehicle.model}
        </p>
        <p className="text-xs text-ink-muted">{vehicle.year} · {formatKm(vehicle.km)}</p>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-accent-hover">
            {vehicle.purchasePrice != null ? formatMoney(vehicle.purchasePrice) : ""}
          </span>
          <Badge tone={vehicle.daysInStage >= 7 ? "critical" : vehicle.daysInStage >= 3 ? "warning" : "neutral"}>
            {daysLabel(vehicle.daysInStage)}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {vehicle.rarDate && daysUntil(vehicle.rarDate) <= 3 && (
            <Badge tone={daysUntil(vehicle.rarDate) < 0 ? "critical" : "warning"}>
              RAR {new Date(vehicle.rarDate).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })}
            </Badge>
          )}
          {vehicle.isSold && <Badge tone="good">Vândută</Badge>}
        </div>
      </div>
    </div>
  );
}
