import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, useDraggable, useDroppable,
  useSensor, useSensors,
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
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const navigate = useNavigate();
  // Juniorii nu mai muta masinile intre etape (backendul respinge oricum);
  // pentru ei board-ul e doar de citit, cu click pe card catre detaliu.
  const canMove = authService.hasRole("Owner", "Vanzari");
  const { search, setSearch, brand, setBrand, model, setModel, filterVehicles } = useVehicleFilters();

  // MouseSensor + TouchSensor, nu PointerSensor: pe touch avem nevoie de alt gest
  // decat pe mouse, iar PointerSensor le trateaza identic. Cu `distance: 6` orice
  // swipe pe un card pornea o mutare, deci board-ul nu putea fi derulat cu degetul.
  // Cu `delay`, apasarea lunga porneste mutarea, iar un swipe (peste `tolerance`
  // inainte de 250ms) lasa browserul sa deruleze normal.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
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

  const handleDragStart = (e: DragStartEvent) => {
    justDragged.current = true;
    setDraggedId(Number(String(e.active.id).replace("vehicle-", "")));
  };

  // Se apeleaza si la anulare, nu doar la final: dnd-kit trimite `onDragCancel`
  // (NU `onDragEnd`) cand gestul e intrerupt — pe touch, exact ce se intampla
  // cand browserul preia gestul pentru derulare.
  const finishDrag = () => {
    setDraggedId(null);
    setTimeout(() => { justDragged.current = false; }, 100);
  };

  // Plasa de siguranta, ca sa nu depindem de faptul ca dnd-kit ne apeleaza inapoi:
  // orice interactiune noua porneste cu flagul curat. Inainte, `justDragged` era
  // resetat DOAR in onDragEnd; daca un drag era anulat (pe telefon, cand browserul
  // preia gestul pentru derulare), rămânea true pentru totdeauna si inghitea TOATE
  // tap-urile urmatoare — cardurile nu mai deschideau detaliul pana la reload.
  const resetDragGuard = () => { justDragged.current = false; };

  const handleDragEnd = async (e: DragEndEvent) => {
    finishDrag();
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
  const draggedVehicle = draggedId != null ? vehicles.find((v) => v.vehicleId === draggedId) : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink">Pipeline</h1>
          <p className="text-sm text-ink-secondary">
            {canMove ? (
              <>
                {/* Pe touch un drag simplu deruleaza, deci instructiunea de desktop
                    ar fi activ greselită. Prin CSS, nu prin detectie de user-agent. */}
                <span className="sm:hidden">
                  Apasă pe o mașină pentru detalii. Ține apăsat, apoi trage-o în altă coloană.
                </span>
                <span className="hidden sm:inline">
                  Trage o mașină în altă coloană pentru a-i schimba etapa.
                </span>
              </>
            ) : (
              "Apasă pe o mașină pentru detalii. Mutarea între etape o fac patronul și echipa de vânzări."
            )}
          </p>
        </div>
        {authService.hasRole("Owner", "Vanzari") && (
          <Button className="shrink-0" onClick={() => setShowForm(true)}>+ Adaugă mașină</Button>
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

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={finishDrag}
        // Derularea automata cat tii cardul in mana. Valorile implicite
        // (acceleration 10, threshold 0.2) sunt gandite pentru un ecran lat:
        // pe telefon zona de declansare inghite o treime din board si viteza
        // face imposibil de nimerit coloana dorita.
        // acceleration 3 = derulare vizibil mai blanda; threshold x 0.08 = porneste
        // doar cand ajungi aproape de margine, deci ai loc sa poziționezi cardul.
        autoScroll={{ acceleration: 3, threshold: { x: 0.08, y: 0.2 } }}
      >
        {/* snap-mandatory doar pe telefon: swipe-ul aterizeaza pe o coloana in loc
            sa se opreasca la mijlocul unui card. Pe desktop vrei derulare libera
            peste toate etapele, de aici sm:snap-none. */}
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 sm:snap-none">
          {stages.map((stage) => (
            <StageColumn
              key={stage.stageId}
              stage={stage}
              vehicles={filtered.filter((v) => v.currentStageId === stage.stageId)}
              onCardClick={handleCardClick}
              onInteractionStart={resetDragGuard}
              canMove={canMove}
            />
          ))}
        </div>
        {/* Cardul tras se randeaza aici, in afara containerului cu scroll. Inainte
            era translatat pe loc INAUNTRUL scroller-ului, ceea ce se purta prost
            la auto-scroll pe mobil. */}
        <DragOverlay dropAnimation={null}>
          {draggedVehicle && (
            <div className="w-60 rotate-2 rounded-xl border border-accent/50 bg-surface p-2 shadow-2xl">
              <VehicleCardBody vehicle={draggedVehicle} />
            </div>
          )}
        </DragOverlay>
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

function StageColumn({ stage, vehicles, onCardClick, onInteractionStart, canMove }: {
  stage: Stage;
  vehicles: Vehicle[];
  onCardClick: (id: number) => void;
  onInteractionStart: () => void;
  canMove: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage-${stage.stageId}` });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-60 shrink-0 snap-start flex-col rounded-xl border p-2 transition-colors sm:w-64 ${
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
            onInteractionStart={onInteractionStart} canMove={canMove} />
        ))}
      </div>
    </div>
  );
}

function VehicleCard({ vehicle, onClick, onInteractionStart, canMove }: {
  vehicle: Vehicle; onClick: () => void; onInteractionStart: () => void; canMove: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `vehicle-${vehicle.vehicleId}`,
    disabled: !canMove,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      // In faza de captura, deci INAINTE de listener-ele dnd-kit: orice atingere
      // noua curata garda de click, ca un drag anulat sa nu poata bloca tap-ul.
      onPointerDownCapture={onInteractionStart}
      onClick={onClick}
      // touch-action: manipulation scoate intarzierea de double-tap-zoom, dar
      // lasa derularea nativa — de care avem nevoie, pentru ca board-ul se
      // deruleaza lateral pornind chiar de pe un card.
      style={{ touchAction: "manipulation" }}
      className={`rounded-xl border border-border bg-surface p-2 shadow-sm transition-all hover:border-accent/40 hover:shadow-[0_8px_30px_-8px_rgba(124,90,255,0.35)] ${
        canMove ? "cursor-grab" : "cursor-pointer"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <VehicleCardBody vehicle={vehicle} />
    </div>
  );
}

// Doar partea vizuala, refolosita si in DragOverlay.
function VehicleCardBody({ vehicle }: { vehicle: Vehicle }) {
  const photo = assetUrl(vehicle.mainPhotoUrl);

  return (
    <>
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
    </>
  );
}
