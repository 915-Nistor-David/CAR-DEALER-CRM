import { useEffect, useRef, useState } from "react";
import { stageService } from "../services/stageService";
import { Badge, Button, Card, Input, Select } from "../components/ui";
import type { DealerSettings, SaveStageRequest, Stage } from "../types";

const NOTIFY_ROLE_OPTIONS = [
  { value: "", label: "Nimeni (doar admin)" },
  { value: "Vanzari", label: "Vânzători" },
  { value: "Junior", label: "Juniori" },
];

const emptyForm: SaveStageRequest = {
  name: "", alertDays: null, notifyRole: null, isSaleReady: false, isSoldStage: false,
};

// Administrarea etapelor pipeline-ului (doar Owner): redenumire, reordonare,
// praguri de alerta, rolul notificat la intrare, marcaj "gata de vanzare".
export default function Stages() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SaveStageRequest>(emptyForm);
  const [adding, setAdding] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Formularul se randeaza deasupra listei — fara asta, dai "Editează" pe o etapa
  // de jos si nu se intampla nimic vizibil (formularul apare in afara ecranului).
  const scrollToForm = () => {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      formRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    });
  };

  const load = async () => {
    try {
      setStages(await stageService.getAll());
      setError("");
    } catch {
      setError("Nu s-au putut încărca etapele.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (s: Stage) => {
    setAdding(false);
    setEditingId(s.stageId);
    setForm({
      name: s.name,
      alertDays: s.alertDays ?? null,
      notifyRole: s.notifyRole ?? null,
      isSaleReady: s.isSaleReady,
      isSoldStage: s.isSoldStage,
    });
    scrollToForm();
  };

  const startAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setAdding(true);
    scrollToForm();
  };

  const cancelForm = () => {
    setEditingId(null);
    setAdding(false);
    setForm(emptyForm);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (adding) await stageService.create(form);
      else if (editingId != null) await stageService.update(editingId, form);
      cancelForm();
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Salvarea a eșuat.");
    }
  };

  const handleDelete = async (s: Stage) => {
    if (!confirm(`Ștergi etapa „${s.name}”?`)) return;
    try {
      await stageService.remove(s.stageId);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Ștergerea a eșuat.");
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    const reordered = [...stages];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setStages(reordered); // optimist
    try {
      await stageService.reorder(reordered.map((s) => s.stageId));
    } catch {
      load(); // revenim la ordinea reala
    }
  };

  if (loading) return <p className="text-ink-secondary">Se încarcă etapele...</p>;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Etapele pipeline-ului</h1>
          <p className="text-sm text-ink-secondary">
            Personalizează statusurile prin care trec mașinile: Mecanică, Vopsitorie, Climă, Detailing...
          </p>
        </div>
        <Button onClick={startAdd}>+ Etapă nouă</Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-critical/15 px-4 py-3 text-sm text-critical">{error}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
          {(adding || editingId != null) && (
            <div ref={formRef} className="scroll-mt-20">
              <StageForm
                title={adding ? "Etapă nouă" : "Editează etapa"}
                form={form}
                setForm={setForm}
                onSubmit={handleSave}
                onCancel={cancelForm}
              />
            </div>
          )}

          {stages.map((s, i) => (
            <div key={s.stageId}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
              <div className="flex flex-col">
                <button onClick={() => handleMove(i, -1)} disabled={i === 0}
                  className="text-ink-muted hover:text-ink disabled:opacity-20">▲</button>
                <button onClick={() => handleMove(i, 1)} disabled={i === stages.length - 1}
                  className="text-ink-muted hover:text-ink disabled:opacity-20">▼</button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                  {s.name}
                  {s.isSaleReady && <Badge tone="good">gata de vânzare</Badge>}
                  {s.isSoldStage && <Badge tone="neutral">vândută</Badge>}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {s.vehicleCount === 1 ? "1 mașină" : `${s.vehicleCount} mașini`} ·
                  alertă la {s.alertDays != null ? `${s.alertDays} zile` : "pragul implicit"} ·
                  {" "}notifică: {NOTIFY_ROLE_OPTIONS.find((o) => o.value === (s.notifyRole ?? ""))?.label.toLowerCase()}
                </p>
              </div>
              <button onClick={() => startEdit(s)} className="text-xs font-medium text-accent hover:underline">
                Editează
              </button>
              <button onClick={() => handleDelete(s)} className="text-xs text-ink-muted hover:text-critical">
                ✕
              </button>
            </div>
          ))}
        </div>

        <SettingsCard />
      </div>
    </div>
  );
}

function StageForm({ title, form, setForm, onSubmit, onCancel }: {
  title: string;
  form: SaveStageRequest;
  setForm: React.Dispatch<React.SetStateAction<SaveStageRequest>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const label = "mb-1 block text-xs font-medium text-ink-secondary";
  return (
    <Card className="border-accent/40">
      <h2 className="mb-3 text-sm font-bold text-ink">{title}</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className={label}>Nume etapă *</label>
          <Input required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Mecanică" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Alertă „stă prea mult” (zile)</label>
            <Input type="number" min={0} max={365} value={form.alertDays ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, alertDays: e.target.value === "" ? null : Number(e.target.value) }))}
              placeholder="implicit" />
          </div>
          <div>
            <label className={label}>Notifică la intrare</label>
            <Select value={form.notifyRole ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notifyRole: e.target.value || null }))}>
              {NOTIFY_ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-secondary">
          <input type="checkbox" checked={form.isSaleReady}
            onChange={(e) => setForm((f) => ({ ...f, isSaleReady: e.target.checked }))} />
          Etapa „gata de vânzare” (folosită pentru potrivirea clienților interesați)
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-secondary">
          <input type="checkbox" checked={form.isSoldStage}
            onChange={(e) => setForm((f) => ({ ...f, isSoldStage: e.target.checked }))} />
          Etapa „vândută” (aici ajunge mașina la înregistrarea vânzării)
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>Anulează</Button>
          <Button type="submit">Salvează</Button>
        </div>
      </form>
    </Card>
  );
}

// Praguri globale de alerta (Dealership): zile implicite per etapa + vechime stoc.
function SettingsCard() {
  const [settings, setSettings] = useState<DealerSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    stageService.getSettings().then(setSettings).catch(() => setError("Setările nu s-au putut încărca."));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await stageService.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Salvarea a eșuat.");
    } finally {
      setSaving(false);
    }
  };

  const label = "mb-1 block text-xs font-medium text-ink-secondary";

  return (
    <Card className="h-fit">
      <h2 className="mb-1 text-sm font-bold text-ink">Setări alerte</h2>
      <p className="mb-3 text-xs text-ink-muted">
        Notificările automate se trimit când o mașină depășește aceste praguri.
      </p>
      {error && <p className="mb-2 text-xs text-critical">{error}</p>}
      {!settings ? (
        <p className="text-xs text-ink-muted">Se încarcă...</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className={label}>Zile în etapă (prag implicit)</label>
            <Input type="number" min={1} max={365} required value={settings.defaultStageAlertDays}
              onChange={(e) => setSettings((s) => s && { ...s, defaultStageAlertDays: Number(e.target.value) })} />
          </div>
          <div>
            <label className={label}>Zile în stoc (mașină „veche”)</label>
            <Input type="number" min={1} max={3650} required value={settings.stockAlertDays}
              onChange={(e) => setSettings((s) => s && { ...s, stockAlertDays: Number(e.target.value) })} />
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Se salvează..." : saved ? "✓ Salvat" : "Salvează setările"}
          </Button>
        </form>
      )}
    </Card>
  );
}
