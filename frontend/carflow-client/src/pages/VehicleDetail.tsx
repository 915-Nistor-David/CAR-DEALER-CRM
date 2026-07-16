import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { vehicleService } from "../services/vehicleService";
import { saleService } from "../services/saleService";
import { assetUrl } from "../services/api";
import { daysLabel, formatDate, formatDateTime, formatKm, formatMoney } from "../utils/format";
import VehicleForm from "../components/VehicleForm";
import { Badge, Button, Card, Input, Select } from "../components/ui";
import { COST_CATEGORIES, PHOTO_CATEGORIES } from "../types";
import type { CreateSaleRequest, Stage, VehicleDetail as VehicleDetailType } from "../types";

export default function VehicleDetail() {
  const { id } = useParams();
  const vehicleId = Number(id);
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState<VehicleDetailType | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);

  const load = async () => {
    try {
      const [v, s] = await Promise.all([
        vehicleService.getById(vehicleId),
        vehicleService.getStages(),
      ]);
      setVehicle(v);
      setStages(s);
      setError("");
    } catch {
      setError("Mașina nu a fost găsită.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [vehicleId]);

  const handleDelete = async () => {
    if (!confirm("Sigur vrei să ștergi această mașină? Se șterg și pozele, costurile și istoricul ei.")) return;
    try {
      await vehicleService.remove(vehicleId);
      navigate("/vehicles");
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Ștergerea a eșuat.");
    }
  };

  if (loading) return <p className="text-ink-secondary">Se încarcă...</p>;
  if (!vehicle) return <p className="text-critical">{error || "Mașina nu a fost găsită."}</p>;

  return (
    <div className="mx-auto max-w-5xl">
      {error && (
        <div className="mb-4 rounded-md bg-critical/15 px-4 py-3 text-sm text-critical">{error}</div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate(-1)} className="mb-1 text-sm text-accent hover:underline">
            ← Înapoi
          </button>
          <h1 className="text-2xl font-bold text-ink">
            {vehicle.make} {vehicle.model}{" "}
            <span className="font-normal text-ink-muted">({vehicle.year})</span>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="info" className="px-3 py-1 text-sm">{vehicle.currentStageName}</Badge>
            <span className="text-sm text-ink-secondary">
              de {daysLabel(vehicle.daysInStage)} în această etapă
            </span>
            {vehicle.isSold && (
              <Badge tone="good" className="px-3 py-1 text-sm">✓ Vândută</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!vehicle.isSold && (
            <button onClick={() => setShowSaleForm(true)}
              className="rounded-md bg-good px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              💰 Marchează ca vândută
            </button>
          )}
          <Button variant="secondary" onClick={() => setShowEdit(true)}>Editează</Button>
          {!vehicle.isSold && (
            <button onClick={handleDelete}
              className="rounded-md border border-critical/30 bg-surface px-4 py-2 text-sm text-critical hover:bg-critical/10">
              Șterge
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coloana principala */}
        <div className="space-y-6 lg:col-span-2">
          <PhotosSection vehicle={vehicle} onChanged={load} />
          <CostsSection vehicle={vehicle} onChanged={load} />
          <HistorySection vehicle={vehicle} />
        </div>

        {/* Coloana laterala */}
        <div className="space-y-6">
          <FinancialCard vehicle={vehicle} />
          {vehicle.sale && <SaleCard vehicle={vehicle} onChanged={load} />}
          {!vehicle.isSold && <StageMover vehicle={vehicle} stages={stages} onChanged={load} />}
          <InfoCard vehicle={vehicle} />
        </div>
      </div>

      {showEdit && (
        <VehicleForm initial={vehicle} onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); }} />
      )}
      {showSaleForm && (
        <SaleForm vehicle={vehicle} onClose={() => setShowSaleForm(false)}
          onSaved={() => { setShowSaleForm(false); load(); }} />
      )}
    </div>
  );
}

function FinancialCard({ vehicle }: { vehicle: VehicleDetailType }) {
  const invested = vehicle.purchasePrice + vehicle.totalCosts;
  return (
    <Card>
      <h2 className="mb-3 text-base font-bold text-ink">Situație financiară</h2>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-secondary">Preț achiziție</dt>
          <dd className="font-medium text-ink">{formatMoney(vehicle.purchasePrice)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-secondary">Costuri (service, transport...)</dt>
          <dd className="font-medium text-ink">{formatMoney(vehicle.totalCosts)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-2">
          <dt className="text-ink-secondary">Total investit</dt>
          <dd className="font-bold text-ink">{formatMoney(invested)}</dd>
        </div>
        {vehicle.sale && (
          <>
            <div className="flex justify-between">
              <dt className="text-ink-secondary">Preț vânzare</dt>
              <dd className="font-medium text-ink">{formatMoney(vehicle.sale.salePrice)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <dt className="font-semibold text-ink-secondary">Profit real</dt>
              <dd className={`text-lg font-bold ${(vehicle.profit ?? 0) >= 0 ? "text-good" : "text-critical"}`}>
                {formatMoney(vehicle.profit ?? 0)}
              </dd>
            </div>
          </>
        )}
      </dl>
    </Card>
  );
}

function StageMover({ vehicle, stages, onChanged }: {
  vehicle: VehicleDetailType; stages: Stage[]; onChanged: () => void;
}) {
  const [stageId, setStageId] = useState(vehicle.currentStageId);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleMove = async () => {
    if (stageId === vehicle.currentStageId) return;
    setSaving(true);
    setError("");
    try {
      await vehicleService.changeStage(vehicle.vehicleId, stageId, note || undefined);
      setNote("");
      onChanged();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Mutarea a eșuat.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <h2 className="mb-3 text-base font-bold text-ink">Mută în altă etapă</h2>
      {error && <p className="mb-2 text-sm text-critical">{error}</p>}
      <div className="space-y-3">
        <Select value={stageId} onChange={(e) => setStageId(Number(e.target.value))}>
          {stages.map((s) => (
            <option key={s.stageId} value={s.stageId}>{s.name}</option>
          ))}
        </Select>
        <Input value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Notă opțională (ex: așteaptă piesă)" />
        <Button onClick={handleMove} disabled={saving || stageId === vehicle.currentStageId} className="w-full py-2">
          {saving ? "Se mută..." : "Mută mașina"}
        </Button>
      </div>
    </Card>
  );
}

function InfoCard({ vehicle }: { vehicle: VehicleDetailType }) {
  return (
    <Card>
      <h2 className="mb-3 text-base font-bold text-ink">Date mașină</h2>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-secondary">Kilometraj</dt>
          <dd className="text-ink">{formatKm(vehicle.km)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-secondary">VIN</dt>
          <dd className="font-mono text-xs text-ink">{vehicle.vin || "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-secondary">Sursă achiziție</dt>
          <dd className="text-ink">{vehicle.acquisitionSource || "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-secondary">În stoc din</dt>
          <dd className="text-ink">{formatDate(vehicle.createdAt)}</dd>
        </div>
      </dl>
      {vehicle.description && (
        <p className="mt-3 border-t border-border pt-3 text-sm text-ink-secondary">{vehicle.description}</p>
      )}
    </Card>
  );
}

function PhotosSection({ vehicle, onChanged }: { vehicle: VehicleDetailType; onChanged: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string>("Exterior");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await vehicleService.uploadPhoto(vehicle.vehicleId, file, category);
      onChanged();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Încărcarea a eșuat.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (photoId: number) => {
    if (!confirm("Ștergi această fotografie?")) return;
    await vehicleService.deletePhoto(vehicle.vehicleId, photoId);
    onChanged();
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">
          Fotografii <span className="font-normal text-ink-muted">({vehicle.photos.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto">
            {PHOTO_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="px-3 py-2">
            {uploading ? "Se încarcă..." : "+ Adaugă poză"}
          </Button>
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden"
            onChange={handleUpload} />
        </div>
      </div>
      {error && <p className="mb-2 text-sm text-critical">{error}</p>}
      {vehicle.photos.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">
          Nicio fotografie încă. Ordinea recomandată: exterior, interior, defecte.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {vehicle.photos.map((p) => (
            <div key={p.photoId} className="group relative">
              <a href={assetUrl(p.url)} target="_blank" rel="noreferrer">
                <img src={assetUrl(p.url)} alt={p.category}
                  className="h-32 w-full rounded-lg object-cover" />
              </a>
              <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
                {p.category}
              </span>
              <button onClick={() => handleDelete(p.photoId)}
                className="absolute right-1.5 top-1.5 hidden rounded-full bg-black/60 px-2 py-0.5 text-xs text-white hover:bg-critical group-hover:block">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function CostsSection({ vehicle, onChanged }: { vehicle: VehicleDetailType; onChanged: () => void }) {
  const [category, setCategory] = useState<string>("Service");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await vehicleService.addCost(vehicle.vehicleId, {
        category, amount: Number(amount), date, description: description || null,
      });
      setAmount("");
      setDescription("");
      onChanged();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Adăugarea a eșuat.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (costId: number) => {
    if (!confirm("Ștergi acest cost?")) return;
    await vehicleService.deleteCost(vehicle.vehicleId, costId);
    onChanged();
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">Costuri</h2>
        <span className="text-sm font-semibold text-ink-secondary">
          Total: {formatMoney(vehicle.totalCosts)}
        </span>
      </div>

      {error && <p className="mb-2 text-sm text-critical">{error}</p>}

      <form onSubmit={handleAdd} className="mb-4 flex flex-wrap items-end gap-2">
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto">
          {COST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input type="number" required min="0.01" step="0.01" value={amount}
          onChange={(e) => setAmount(e.target.value)} placeholder="Sumă (€)" className="w-28" />
        <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        <Input value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Descriere (opțional)" className="min-w-32 flex-1" />
        <Button type="submit" disabled={saving} className="px-3 py-2">Adaugă</Button>
      </form>

      {vehicle.costs.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-muted">
          Niciun cost înregistrat. Adaugă transportul, service-ul, piesele — ca profitul real să fie corect.
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-ink-muted">
            <tr>
              <th className="py-2">Categorie</th>
              <th className="py-2">Dată</th>
              <th className="py-2">Descriere</th>
              <th className="py-2 text-right">Sumă</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vehicle.costs.map((c) => (
              <tr key={c.costId} className="border-t border-border">
                <td className="py-2">
                  <Badge tone="neutral">{c.category}</Badge>
                </td>
                <td className="py-2 text-ink-secondary">{formatDate(c.date)}</td>
                <td className="py-2 text-ink-secondary">{c.description || "—"}</td>
                <td className="py-2 text-right font-medium text-ink">{formatMoney(c.amount)}</td>
                <td className="py-2 pl-2 text-right">
                  <button onClick={() => handleDelete(c.costId)}
                    className="text-xs text-ink-muted hover:text-critical">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function HistorySection({ vehicle }: { vehicle: VehicleDetailType }) {
  return (
    <Card>
      <h2 className="mb-4 text-base font-bold text-ink">Istoric etape</h2>
      <ol className="relative max-h-80 space-y-4 overflow-y-auto border-l border-border pl-4">
        {vehicle.history.map((h) => (
          <li key={h.historyId} className="relative">
            <span className="absolute -left-[22px] top-1.5 h-3 w-3 rounded-full border-2 border-surface bg-accent" />
            <p className="text-sm text-ink">
              {h.fromStageName ? (
                <>
                  <span className="text-ink-secondary">{h.fromStageName}</span>
                  {" → "}
                  <span className="font-semibold">{h.toStageName}</span>
                </>
              ) : (
                <span className="font-semibold">{h.toStageName}</span>
              )}
            </p>
            <p className="text-xs text-ink-muted">
              {formatDateTime(h.timestamp)} · {h.userName}
            </p>
            {h.note && <p className="mt-0.5 text-xs italic text-ink-secondary">„{h.note}"</p>}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function SaleCard({ vehicle, onChanged }: { vehicle: VehicleDetailType; onChanged: () => void }) {
  const sale = vehicle.sale!;
  const [saving, setSaving] = useState(false);

  const toggle = async (field: "docsHandedOver" | "platesDone" | "warrantyGiven") => {
    setSaving(true);
    try {
      await saleService.updateChecklist(sale.saleId, {
        docsHandedOver: field === "docsHandedOver" ? !sale.docsHandedOver : sale.docsHandedOver,
        platesDone: field === "platesDone" ? !sale.platesDone : sale.platesDone,
        warrantyGiven: field === "warrantyGiven" ? !sale.warrantyGiven : sale.warrantyGiven,
      });
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-good/30">
      <h2 className="mb-3 text-base font-bold text-ink">Detalii vânzare</h2>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-secondary">Dată</dt>
          <dd className="text-ink">{formatDate(sale.saleDate)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-secondary">Tip</dt>
          <dd className="text-ink">{sale.type === "Finantat" ? "Finanțat" : "Cash"}</dd>
        </div>
        {sale.financingPartner && (
          <div className="flex justify-between">
            <dt className="text-ink-secondary">Finanțator</dt>
            <dd className="text-ink">{sale.financingPartner}</dd>
          </div>
        )}
        {sale.financingTerms && (
          <div className="flex justify-between">
            <dt className="text-ink-secondary">Termeni</dt>
            <dd className="text-ink">{sale.financingTerms}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-ink-secondary">Cumpărător</dt>
          <dd className="text-ink">{sale.buyerName}</dd>
        </div>
        {sale.buyerPhone && (
          <div className="flex justify-between">
            <dt className="text-ink-secondary">Telefon</dt>
            <dd className="text-ink">{sale.buyerPhone}</dd>
          </div>
        )}
      </dl>
      <div className="mt-4 border-t border-border pt-3">
        <p className="mb-2 text-xs font-semibold uppercase text-ink-muted">Checklist post-vânzare</p>
        <div className="space-y-1.5 text-sm text-ink-secondary">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={sale.docsHandedOver} disabled={saving}
              onChange={() => toggle("docsHandedOver")} />
            Acte predate
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={sale.platesDone} disabled={saving}
              onChange={() => toggle("platesDone")} />
            Plăcuțe înmatriculare
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={sale.warrantyGiven} disabled={saving}
              onChange={() => toggle("warrantyGiven")} />
            Garanție predată
          </label>
        </div>
      </div>
    </Card>
  );
}

function SaleForm({ vehicle, onClose, onSaved }: {
  vehicle: VehicleDetailType; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<CreateSaleRequest>({
    salePrice: 0,
    saleDate: new Date().toISOString().slice(0, 10),
    type: "Cash",
    financingPartner: "",
    financingTerms: "",
    buyerName: "",
    buyerPhone: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const invested = vehicle.purchasePrice + vehicle.totalCosts;
  const estimatedProfit = form.salePrice - invested;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await vehicleService.createSale(vehicle.vehicleId, {
        ...form,
        financingPartner: form.type === "Finantat" ? form.financingPartner : null,
        financingTerms: form.type === "Finantat" ? form.financingTerms || null : null,
        buyerPhone: form.buyerPhone || null,
      });
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Înregistrarea vânzării a eșuat.");
      setSaving(false);
    }
  };

  const label = "mb-1 block text-sm font-medium text-ink-secondary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">
            Vinde {vehicle.make} {vehicle.model}
          </h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">✕</button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-critical/15 px-4 py-3 text-sm text-critical">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Preț vânzare (€) *</label>
              <Input type="number" required min="0.01" step="0.01"
                value={form.salePrice || ""}
                onChange={(e) => setForm((f) => ({ ...f, salePrice: Number(e.target.value) }))} />
            </div>
            <div>
              <label className={label}>Data vânzării *</label>
              <Input type="date" required value={form.saleDate}
                onChange={(e) => setForm((f) => ({ ...f, saleDate: e.target.value }))} />
            </div>
          </div>

          {form.salePrice > 0 && (
            <div className={`rounded-md px-4 py-3 text-sm ${estimatedProfit >= 0 ? "bg-good/15 text-good" : "bg-critical/15 text-critical"}`}>
              Total investit: <strong>{formatMoney(invested)}</strong> → profit estimat:{" "}
              <strong>{formatMoney(estimatedProfit)}</strong>
            </div>
          )}

          <div>
            <label className={label}>Tip vânzare *</label>
            <div className="flex gap-4 text-sm text-ink-secondary">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="saleType" checked={form.type === "Cash"}
                  onChange={() => setForm((f) => ({ ...f, type: "Cash" }))} />
                Cash
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="saleType" checked={form.type === "Finantat"}
                  onChange={() => setForm((f) => ({ ...f, type: "Finantat" }))} />
                Finanțat
              </label>
            </div>
          </div>

          {form.type === "Finantat" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label}>Partener finanțare *</label>
                <Input required value={form.financingPartner ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, financingPartner: e.target.value }))}
                  placeholder="TBI Bank, Cetelem..." />
              </div>
              <div>
                <label className={label}>Termeni</label>
                <Input value={form.financingTerms ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, financingTerms: e.target.value }))}
                  placeholder="60 rate, avans 20%..." />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Nume cumpărător *</label>
              <Input required value={form.buyerName}
                onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
                placeholder="Ion Popescu" />
            </div>
            <div>
              <label className={label}>Telefon</label>
              <Input value={form.buyerPhone ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, buyerPhone: e.target.value }))}
                placeholder="07xx xxx xxx" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Anulează</Button>
            <button type="submit" disabled={saving}
              className="rounded-md bg-good px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
              {saving ? "Se salvează..." : "Înregistrează vânzarea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
