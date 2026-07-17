import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { Button, Input } from "../components/ui";

export default function Register() {
  const navigate = useNavigate();
  const [dealershipName, setDealershipName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Parolele nu coincid.");
      return;
    }
    if (password.length < 6) {
      setError("Parola trebuie să aibă cel puțin 6 caractere.");
      return;
    }
    setLoading(true);
    try {
      await authService.register(dealershipName, name, email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Înregistrarea a eșuat. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-page px-4 py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-[0_30px_80px_-20px_rgba(124,90,255,0.3)]">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b6bff] to-[#5b34d9] text-lg font-bold text-white">
            C
          </div>
          <h1 className="mt-3 text-2xl font-bold text-ink">Creează-ți contul CarFlow</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Un cont nou creează un dealer nou — tu devii proprietarul lui.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-critical/15 px-4 py-3 text-sm text-critical">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">Numele dealerului</label>
            <Input required value={dealershipName} onChange={(e) => setDealershipName(e.target.value)}
              placeholder="Auto Impex SRL" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">Numele tău</label>
            <Input required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ion Popescu" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">Email</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplu.ro" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">Parolă</label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="minim 6 caractere" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">Confirmă parola</label>
            <Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••" />
          </div>
          <Button type="submit" disabled={loading} className="w-full py-2.5">
            {loading ? "Se creează contul..." : "Creează contul"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-secondary">
          Ai deja cont?{" "}
          <Link to="/login" className="font-medium text-accent hover:underline">Conectare</Link>
        </p>
      </div>
    </div>
  );
}
