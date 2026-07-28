import { useEffect, useState } from "react";
import { reportService } from "../services/reportService";
import { formatDateTime, toDateOnlyIso } from "../utils/format";
import { Badge, Button, Input } from "../components/ui";
import { ROLE_LABELS } from "../types";
import type { ActivityReport } from "../types";

// Ziua locala, nu toISOString() — acesta din urma da ziua UTC, adica "ieri"
// pentru Romania in primele ore ale diminetii, si excludea ziua curenta din raport.
const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toDateOnlyIso(d);
};

// Raport pentru Owner: cine a mutat cate masini intre etape (contorizarea angajatilor).
export default function Activity() {
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [report, setReport] = useState<ActivityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (f = from, t = to) => {
    setLoading(true);
    try {
      setReport(await reportService.activity(f, t));
      setError("");
    } catch {
      setError("Raportul nu s-a putut încărca.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  const totalMoves = report?.users.reduce((sum, u) => sum + u.totalMoves, 0) ?? 0;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-ink">Activitatea echipei</h1>
        <p className="text-sm text-ink-secondary">
          Cine a mutat mașinile între etape — fiecare mutare este înregistrată cu autor și dată.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-secondary">De la</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-secondary">Până la</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
        </div>
        <Button onClick={() => load()}>Aplică</Button>
        {report && (
          <span className="ml-auto rounded-full border border-border px-3 py-1.5 text-xs text-ink-secondary">
            {totalMoves} mutări în total
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-critical/15 px-4 py-3 text-sm text-critical">{error}</div>
      )}

      {loading ? (
        <p className="text-ink-secondary">Se încarcă raportul...</p>
      ) : !report || report.users.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center shadow-sm">
          <p className="text-ink-secondary">Nicio mutare înregistrată în acest interval.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-alt text-xs uppercase text-ink-muted">
              <tr>
                <th className="px-4 py-3">Angajat</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Mutări</th>
                <th className="px-4 py-3">Ultima activitate</th>
                <th className="px-4 py-3">Pe etape</th>
              </tr>
            </thead>
            <tbody>
              {report.users.map((u, i) => (
                <tr key={u.userId} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">
                    {i === 0 && <span title="cel mai activ">🏆 </span>}{u.userName}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.role === "Owner" ? "critical" : u.role === "Vanzari" ? "info" : "good"}>
                      {ROLE_LABELS[u.role] ?? u.role ?? "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-base font-bold text-ink">{u.totalMoves}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">
                    {u.lastMoveAt ? formatDateTime(u.lastMoveAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {/* max-w-md = 448px intr-un rand de 343px: singura celula
                        care forta derularea acestui tabel. Plafonul are sens
                        doar unde exista loc pentru el. */}
                    <div className="flex flex-wrap gap-1 md:max-w-md">
                      {u.stageBreakdown.map((s) => (
                        <span key={s.stageId}
                          className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px] text-ink-secondary">
                          {s.stageName} × {s.count}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
