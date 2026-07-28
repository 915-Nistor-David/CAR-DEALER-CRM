import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { agendaService } from "../services/agendaService";
import { notificationMeta } from "../utils/notificationMeta";
import { formatDate, parseDateOnly, toDateOnlyIso } from "../utils/format";
import { Badge, Button, Card } from "../components/ui";
import type { AgendaEntry } from "../types";

const WEEKDAYS = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];

// Toate zilele lunii + zilele de completare, incepand de luni.
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // luni = 0
  const start = new Date(year, month, 1 - offset);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  return days;
}

// Agenda: tot ce are termen intr-un singur loc — programari RAR, acte de rezolvat,
// masini care depasesc pragul etapei sau stau prea mult in stoc.
export default function Agenda() {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => new Date());
  const [entries, setEntries] = useState<AgendaEntry[]>([]);
  const [today, setToday] = useState<string>(toDateOnlyIso(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Cerem o fereastra generoasa: grila lunara arata si zile din lunile vecine.
        const from = toDateOnlyIso(new Date(year, month, -7));
        const to = toDateOnlyIso(new Date(year, month + 1, 14));
        const data = await agendaService.get(from, to);
        if (cancelled) return;
        setEntries(data.entries);
        setToday(data.today);
        setError("");
      } catch {
        if (!cancelled) setError("Agenda nu s-a putut încărca.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [year, month]);

  const byDate = useMemo(() => {
    const map = new Map<string, AgendaEntry[]>();
    for (const e of entries) {
      const list = map.get(e.date);
      if (list) list.push(e);
      else map.set(e.date, [e]);
    }
    return map;
  }, [entries]);

  // Ce urmeaza (si ce e deja restant) — lista de sub calendar.
  const upcoming = useMemo(() => {
    const limit = toDateOnlyIso(new Date(parseDateOnly(today).getTime() + 7 * 86_400_000));
    return entries
      .filter((e) => e.date <= limit)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, today]);

  const grid = buildMonthGrid(year, month);
  const monthLabel = cursor.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-ink">Agendă</h1>
        <p className="text-sm text-ink-secondary">
          Programări RAR, acte cu termen și mașini care depășesc pragurile de alertă.
        </p>
      </div>

      {error && <div className="mb-4 rounded-md bg-critical/15 px-4 py-3 text-sm text-critical">{error}</div>}

      <Card className="mb-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {/* „septembrie 2026" langa cele trei butoane nu incape pe un ecran
              ingust — randul se pliaza in loc sa se stranga luna. */}
          <h2 className="min-w-0 text-base font-bold capitalize text-ink">{monthLabel}</h2>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" aria-label="Luna precedentă" className="min-w-11"
              onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</Button>
            <Button variant="secondary" aria-label="Luna curentă"
              onClick={() => setCursor(new Date())}>Azi</Button>
            <Button variant="secondary" aria-label="Luna următoare" className="min-w-11"
              onClick={() => setCursor(new Date(year, month + 1, 1))}>›</Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-1 text-center text-[11px] font-medium text-ink-muted">{d}</div>
          ))}
          {grid.map((day) => {
            const iso = toDateOnlyIso(day);
            const dayEntries = byDate.get(iso) ?? [];
            const inMonth = day.getMonth() === month;
            const isToday = iso === today;
            return (
              <div key={iso}
                className={`min-h-20 rounded-lg border p-1 ${
                  isToday ? "border-accent bg-accent/5" : "border-border/60"
                } ${inMonth ? "" : "opacity-40"}`}>
                <div className={`mb-0.5 px-0.5 text-[11px] ${isToday ? "font-bold text-accent" : "text-ink-muted"}`}>
                  {day.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayEntries.slice(0, 3).map((e, i) => {
                    const { chip } = notificationMeta(e.kind);
                    return (
                      <button key={`${e.kind}-${e.vehicleId}-${i}`}
                        onClick={() => navigate(`/vehicles/${e.vehicleId}`)}
                        title={`${e.title} · ${e.vehicleName}`}
                        className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] ${chip} ${
                          e.isOverdue ? "ring-1 ring-critical/50" : ""
                        }`}>
                        {e.vehicleName}
                      </button>
                    );
                  })}
                  {dayEntries.length > 3 && (
                    <p className="px-1 text-[10px] text-ink-muted">+{dayEntries.length - 3}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-bold text-ink">Restante și următoarele 7 zile</h2>
        {loading ? (
          <p className="text-sm text-ink-muted">Se încarcă...</p>
        ) : upcoming.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">
            Nimic de rezolvat în perioada următoare. 🎉
          </p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((e, i) => {
              const { Icon, chip } = notificationMeta(e.kind);
              return (
                <button key={`${e.kind}-${e.vehicleId}-${i}`}
                  onClick={() => navigate(`/vehicles/${e.vehicleId}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 text-left transition-colors hover:bg-surface-alt/60">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${chip}`}>
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                      {e.title}
                      {e.isOverdue && <Badge tone="critical">restant</Badge>}
                    </p>
                    <p className="truncate text-xs text-ink-secondary">
                      {e.vehicleName}{e.detail ? ` · ${e.detail}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs ${e.isOverdue ? "font-semibold text-critical" : "text-ink-muted"}`}>
                    {formatDate(e.date)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
