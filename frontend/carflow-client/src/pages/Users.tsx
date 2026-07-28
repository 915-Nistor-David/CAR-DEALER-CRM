import { useEffect, useState } from "react";
import { userService } from "../services/userService";
import { authService } from "../services/authService";
import { formatDate } from "../utils/format";
import { Badge, Button, Input, Modal, Select } from "../components/ui";
import { ROLES, ROLE_LABELS } from "../types";
import type { CreateUserRequest, ManagedUser } from "../types";

const roleTone = (role: string) =>
  role === "Owner" ? "critical" : role === "Vanzari" ? "info" : "good";

// Administrare conturi angajati (doar Owner): creare, schimbare rol, dezactivare.
export default function Users() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const me = authService.getUser();

  const load = async () => {
    try {
      setUsers(await userService.getAll());
      setError("");
    } catch {
      setError("Nu s-au putut încărca utilizatorii.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRoleChange = async (u: ManagedUser, role: string) => {
    try {
      await userService.update(u.userId, role, u.isActive);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Schimbarea rolului a eșuat.");
    }
  };

  const handleToggleActive = async (u: ManagedUser) => {
    const verb = u.isActive ? "dezactivezi" : "reactivezi";
    if (!confirm(`Sigur ${verb} contul lui ${u.name}?`)) return;
    try {
      await userService.update(u.userId, u.role, !u.isActive);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Operațiunea a eșuat.");
    }
  };

  if (loading) return <p className="text-ink-secondary">Se încarcă utilizatorii...</p>;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink">Utilizatori</h1>
          <p className="text-sm text-ink-secondary">
            Conturile echipei tale: administratori, vânzători și juniori (service/detailing).
          </p>
        </div>
        <Button className="shrink-0" onClick={() => setShowForm(true)}>+ Cont nou</Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-critical/15 px-4 py-3 text-sm text-critical">{error}</div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-alt text-xs uppercase text-ink-muted">
            <tr>
              <th className="px-4 py-3">Nume</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Creat</th>
              <th className="px-4 py-3">Stare</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.userId === me?.userId;
              return (
                <tr key={u.userId}
                  className={`border-b border-border/60 last:border-0 ${u.isActive ? "" : "opacity-50"}`}>
                  <td className="px-4 py-3 font-medium text-ink">
                    {u.name}{isSelf && <span className="ml-1.5 text-xs text-ink-muted">(tu)</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">{u.email}</td>
                  <td className="px-4 py-3">
                    {isSelf ? (
                      <Badge tone={roleTone(u.role)}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                    ) : (
                      <Select value={u.role} onChange={(e) => handleRoleChange(u, e.target.value)}
                        className="w-auto">
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </Select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={u.isActive ? "good" : "neutral"}>
                      {u.isActive ? "Activ" : "Dezactivat"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isSelf && (
                      <button onClick={() => handleToggleActive(u)}
                        className={`text-xs font-medium hover:underline ${u.isActive ? "text-critical" : "text-good"}`}>
                        {u.isActive ? "Dezactivează" : "Reactivează"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <CreateUserModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CreateUserRequest>({
    name: "", email: "", password: "", role: "Junior",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await userService.create(form);
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Crearea contului a eșuat.");
      setSaving(false);
    }
  };

  const label = "mb-1 block text-sm font-medium text-ink-secondary";

  return (
    <Modal
      title="Cont nou pentru un angajat"
      onClose={onClose}
      onSubmit={handleSubmit}
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>Anulează</Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Se creează..." : "Creează contul"}
          </Button>
        </>
      }
    >
      {error && (
        <div className="rounded-md bg-critical/15 px-4 py-3 text-sm text-critical">{error}</div>
      )}

      <div>
        <label className={label}>Nume *</label>
        <Input required value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Ion Popescu" />
      </div>
      <div>
        <label className={label}>Email *</label>
        <Input type="email" required value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="ion@dealer.ro" />
      </div>
      <div>
        <label className={label}>Parolă * <span className="font-normal text-ink-muted">(minim 6 caractere)</span></label>
        <Input type="password" required minLength={6} value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
      </div>
      <div>
        <label className={label}>Rol *</label>
        <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </Select>
      </div>
    </Modal>
  );
}
