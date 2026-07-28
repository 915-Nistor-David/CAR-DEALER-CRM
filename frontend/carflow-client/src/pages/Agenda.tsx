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
  // Doar pe telefon: ziua atinsa isi arata continutul intr-o lista sub calendar,
  // pentru ca in celula nu incape text citibil.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
            const isSelected = iso === selectedDate;
            return (
              <div key={iso}
                className={`rounded-lg border p-1 sm:min-h-20 ${
                  isToday ? "border-accent bg-accent/5" : "border-border/60"
                } ${isSelected ? "ring-2 ring-accent sm:ring-0" : ""} ${inMonth ? "" : "opacity-40"}`}>
                {/* Pe telefon celula are ~46px latime: un `truncate` acolo arata
                    patru caractere dintr-un nume de masina, adica nimic. Ziua
                    devine un buton care arata cate intrari are; continutul lor
                    se citeste in lista de dedesubt. */}
                <button
                  onClick={() => setSelectedDate(isSelected ? null : iso)}
                  aria-label={`${day.getDate()} ${monthLabel}, ${
                    dayEntries.length === 0 ? "nimic de rezolvat"
                      : dayEntries.length === 1 ? "1 lucru de rezolvat"
                      : `${dayEntries.length} lucruri de rezolvat`
                  }`}
                  aria-pressed={isSelected}
                  className="flex min-h-11 w-full flex-col items-center justify-center gap-1 sm:hidden">
                  <span className={`text-[11px] ${isToday ? "font-bold text-accent" : "text-ink-muted"}`}>
                    {day.getDate()}
                  </span>
                  <span className="flex h-1.5 items-center gap-0.5">
                    {dayEntries.slice(0, 3).map((e, i) => (
                      <span key={`${e.kind}-${e.vehicleId}-${i}`}
                        className={`h-1.5 w-1.5 rounded-full ${notificationMeta(e.kind).chip} ${
                          e.isOverdue ? "ring-1 ring-critical/60" : ""
                        }`} />
                    ))}
                    {dayEntries.length > 3 && (
                      <span className="text-[9px] leading-none text-ink-muted">+</span>
                    )}
                  </span>
                </button>

                <div className="hidden sm:block">
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
              </div>
            );
          })}
        </div>
      </Card>

      {selectedDate && (
        <Card className="mb-4 sm:hidden">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="min-w-0 text-base font-bold text-ink">{formatDate(selectedDate)}</h2>
            <button onClick={() => setSelectedDate(null)} aria-label="Închide ziua"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:text-ink">
              ✕
            </button>
          </div>
          {(byDate.get(selectedDate) ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-muted">Nimic de rezolvat în această zi.</p>
          ) : (
            <div className="space-y-2">
              {(byDate.get(selectedDate) ?? []).map((e, i) => (
                <EntryRow key={`${e.kind}-${e.vehicleId}-${i}`} entry={e}
                  onClick={() => navigate(`/vehicles/${e.vehicleId}`)} />
              ))}
            </div>
          )}
        </Card>
      )}

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
            {upcoming.map((e, i) => (
              <EntryRow key={`${e.kind}-${e.vehicleId}-${i}`} entry={e}
                onClick={() => navigate(`/vehicles/${e.vehicleId}`)} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// Randul unei intrari — folosit si in „Restante", si in ziua deschisa de pe
// telefon. Aici traieste `title`-ul care in calendar exista doar ca tooltip,
// deci pe touch nu se putea citi deloc.
function EntryRow({ entry, onClick }: { entry: AgendaEntry; onClick: () => void }) {
  const { Icon, chip } = notificationMeta(entry.kind);
  return (
    <button onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 text-left transition-colors hover:bg-surface-alt/60">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${chip}`}>
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
          {entry.title}
          {entry.isOverdue && <Badge tone="critical">restant</Badge>}
        </p>
        <p className="truncate text-xs text-ink-secondary">
          {entry.vehicleName}{entry.detail ? ` · ${entry.detail}` : ""}
        </p>
      </div>
      <span className={`shrink-0 text-xs ${entry.isOverdue ? "font-semibold text-critical" : "text-ink-muted"}`}>
        {formatDate(entry.date)}
      </span>
    </button>
  );
}
