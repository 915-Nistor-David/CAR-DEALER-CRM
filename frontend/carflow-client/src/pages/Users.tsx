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

      {/* Sub md randul devine card (vezi UserCard). Emailurile nu se pot trunchia
          util intr-o coloana de tabel ingusta, iar select-ul de rol e un control
          viu care trebuie sa ramana la indemana, nu ascuns dupa o derulare. */}
      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm md:block">
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
                    <RoleControl user={u} isSelf={isSelf} onChange={handleRoleChange} />
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3"><StateBadge active={u.isActive} /></td>
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

      <div className="space-y-3 md:hidden">
        {users.map((u) => (
          <UserCard key={u.userId} user={u} isSelf={u.userId === me?.userId}
            onRoleChange={handleRoleChange} onToggleActive={handleToggleActive} />
        ))}
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

// Bucatile comune tabelului si cardului.
function RoleControl({ user, isSelf, onChange }: {
  user: ManagedUser; isSelf: boolean; onChange: (u: ManagedUser, role: string) => void;
}) {
  // Ownerul nu-si poate schimba propriul rol — s-ar putea inchide singur afara.
  if (isSelf) return <Badge tone={roleTone(user.role)}>{ROLE_LABELS[user.role] ?? user.role}</Badge>;
  return (
    <Select value={user.role} onChange={(e) => onChange(user, e.target.value)} className="w-auto">
      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
    </Select>
  );
}

function StateBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? "good" : "neutral"}>{active ? "Activ" : "Dezactivat"}</Badge>;
}

function UserCard({ user, isSelf, onRoleChange, onToggleActive }: {
  user: ManagedUser; isSelf: boolean;
  onRoleChange: (u: ManagedUser, role: string) => void;
  onToggleActive: (u: ManagedUser) => void;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-4 shadow-sm ${user.isActive ? "" : "opacity-50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-ink">
            {user.name}{isSelf && <span className="ml-1.5 text-xs text-ink-muted">(tu)</span>}
          </p>
          {/* break-all, nu truncate: un email taiat nu ajuta pe nimeni. */}
          <p className="break-all text-sm text-ink-secondary">{user.email}</p>
        </div>
        <span className="shrink-0"><StateBadge active={user.isActive} /></span>
      </div>

      <p className="mt-1 text-xs text-ink-muted">Creat {formatDate(user.createdAt)}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        <RoleControl user={user} isSelf={isSelf} onChange={onRoleChange} />
        {!isSelf && (
          <button onClick={() => onToggleActive(user)}
            className={`ml-auto flex min-h-11 items-center rounded-lg px-2 text-xs font-medium hover:underline ${
              user.isActive ? "text-critical" : "text-good"
            }`}>
            {user.isActive ? "Dezactivează" : "Reactivează"}
          </button>
        )}
      </div>
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
