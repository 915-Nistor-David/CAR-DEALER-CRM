import { useState } from "react";
import { vehicleService } from "../services/vehicleService";
import { authService } from "../services/authService";
import { Button, Input, Modal, Textarea } from "./ui";
import type { SaveVehicleRequest, Vehicle, VehicleFormState } from "../types";

interface Props {
  initial?: Vehicle | null;
  onClose: () => void;
  onSaved: (vehicleId: number) => void;
}

// Formular de adaugare/editare masina, afisat ca modal.
export default function VehicleForm({ initial, onClose, onSaved }: Props) {
  const isEdit = !!initial;
  // Non-Owner nu vede pretul de achizitie — campul e ascuns, iar backend-ul
  // ignora oricum valoarea la update-urile venite de la non-Owner.
  const isOwner = authService.isOwner();
  const [form, setForm] = useState<VehicleFormState>({
    vin: initial?.vin ?? "",
    make: initial?.make ?? "",
    model: initial?.model ?? "",
    year: initial?.year ?? new Date().getFullYear(),
    // null, nu 0 — un 0 pre-completat obliga utilizatorul sa selecteze si sa stearga,
    // iar daca nu o face scrie in continuarea lui (5 -> 05000).
    km: initial?.km ?? null,
    purchasePrice: initial?.purchasePrice ?? null,
    rarDate: initial?.rarDate ?? "",
    acquisitionSource: initial?.acquisitionSource ?? "",
    description: initial?.description ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (field: keyof VehicleFormState, value: string | number | null) =>
    setForm((f) => ({ ...f, [field]: value }));

  // Camp numeric golit => null, nu 0. Altfel stergerea pretului ca sa-l rescrii
  // il salva tacit ca 0 si umfla profitul masinii peste tot.
  const setNumber = (field: "year" | "km" | "purchasePrice", raw: string) =>
    set(field, raw === "" ? null : Number(raw));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.year == null) return setError("Anul de fabricație este obligatoriu.");
    if (form.km == null) return setError("Kilometrajul este obligatoriu.");
    if (isOwner && form.purchasePrice == null)
      return setError("Prețul de achiziție este obligatoriu.");

    setSaving(true);
    try {
      const payload: SaveVehicleRequest = {
        ...form,
        year: form.year,
        km: form.km ?? 0,
        // Non-Owner nu vede si nu trimite pretul; backend-ul ignora oricum valoarea.
        purchasePrice: form.purchasePrice ?? 0,
        vin: form.vin || null,
        rarDate: form.rarDate || null,
        acquisitionSource: form.acquisitionSource || null,
        description: form.description || null,
      };
      if (isEdit) {
        await vehicleService.update(initial!.vehicleId, payload);
        onSaved(initial!.vehicleId);
      } else {
        const id = await vehicleService.create(payload);
        onSaved(id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Salvarea a eșuat.");
      setSaving(false);
    }
  };

  const label = "mb-1 block text-sm font-medium text-ink-secondary";

  return (
    <Modal
      title={isEdit ? "Editează mașina" : "Adaugă mașină în stoc"}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Anulează
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Se salvează..." : isEdit ? "Salvează" : "Adaugă mașina"}
          </Button>
        </>
      }
    >
      {error && (
        <div className="rounded-md bg-critical/15 px-4 py-3 text-sm text-critical">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Marcă *</label>
          <Input required value={form.make} onChange={(e) => set("make", e.target.value)}
            placeholder="Volkswagen" />
        </div>
        <div>
          <label className={label}>Model *</label>
          <Input required value={form.model} onChange={(e) => set("model", e.target.value)}
            placeholder="Golf 7" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>An fabricație *</label>
          <Input type="number" required min={1950} max={2100} value={form.year ?? ""}
            onChange={(e) => setNumber("year", e.target.value)} />
        </div>
        <div>
          <label className={label}>Kilometraj *</label>
          <Input type="number" required min={0} value={form.km ?? ""}
            onChange={(e) => setNumber("km", e.target.value)} placeholder="132000" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isOwner && (
          <div>
            <label className={label}>Preț achiziție (€) *</label>
            <Input type="number" required min={0} step="0.01" value={form.purchasePrice ?? ""}
              onChange={(e) => setNumber("purchasePrice", e.target.value)} />
          </div>
        )}
        {/* Fara pretul de achizitie (non-Owner) VIN-ul ramane singur pe rand,
            deci ocupa ambele coloane — dar doar acolo unde exista doua. */}
        <div className={isOwner ? "" : "sm:col-span-2"}>
          <label className={label}>VIN</label>
          <Input value={form.vin ?? ""} onChange={(e) => set("vin", e.target.value)}
            placeholder="WVWZZZ..." maxLength={20} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Programare RAR</label>
          <Input type="date" value={form.rarDate ?? ""}
            onChange={(e) => set("rarDate", e.target.value)} />
        </div>
        <div>
          <label className={label}>Sursă achiziție</label>
          <Input value={form.acquisitionSource ?? ""} onChange={(e) => set("acquisitionSource", e.target.value)}
            placeholder="Licitație B2B, persoană fizică..." />
        </div>
      </div>
      <div>
        <label className={label}>Descriere</label>
        <Textarea rows={3} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)}
          placeholder="Dotări, stare, observații..." />
      </div>
    </Modal>
  );
}
