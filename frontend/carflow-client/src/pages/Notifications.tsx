import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { notificationService } from "../services/notificationService";
import { notificationMeta, timeAgo } from "../utils/notificationMeta";
import { formatDateTime } from "../utils/format";
import { Badge, Button, Card, Input, Select } from "../components/ui";
import { NOTIFICATION_CATEGORIES, NOTIFICATION_TYPE_LABELS } from "../types";
import type { AppNotification } from "../types";

const PAGE_SIZE = 30;

// Istoricul complet de notificari, cu filtrele cerute de dealer:
// categorie, tip, citit/necitit si interval de date.
export default function Notifications() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<string | null>(null);
  const [type, setType] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);

  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadByCategory, setUnreadByCategory] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await notificationService.getMine({
          category, type: type || null, unreadOnly,
          from: from || null, to: to || null,
          skip: page * PAGE_SIZE, take: PAGE_SIZE,
        });
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        setUnreadByCategory(data.unreadByCategory);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [category, type, unreadOnly, from, to, page]);

  // Orice schimbare de filtru trebuie sa reporneasca paginarea.
  const withReset = <T,>(setter: (v: T) => void) => (v: T) => { setPage(0); setter(v); };

  const handleOpen = (n: AppNotification) => {
    if (!n.isRead) {
      setItems((list) => list.map((i) => (i.notificationId === n.notificationId ? { ...i, isRead: true } : i)));
      notificationService.markRead(n.notificationId).catch(() => {});
    }
    if (n.linkUrl) navigate(n.linkUrl);
  };

  const handleMarkAll = async () => {
    await notificationService.markAllRead(category);
    setItems((list) => list.map((i) => ({ ...i, isRead: true })));
    setUnreadByCategory((m) => (category ? { ...m, [category]: 0 } : {}));
  };

  const clearFilters = () => {
    setPage(0);
    setCategory(null);
    setType("");
    setUnreadOnly(false);
    setFrom("");
    setTo("");
  };

  const hasFilters = category !== null || type !== "" || unreadOnly || from !== "" || to !== "";
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const tabClass = (active: boolean) =>
    `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-accent/15 text-accent ring-1 ring-accent/40" : "text-ink-secondary hover:bg-surface-hover hover:text-ink"
    }`;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Notificări</h1>
          <p className="text-sm text-ink-secondary">
            Tot ce s-a întâmplat în stoc: mutări, bani, lucruri de rezolvat.
          </p>
        </div>
        <Button variant="secondary" onClick={handleMarkAll}>
          {category ? `Marchează „${category}” citit` : "Marchează toate citite"}
        </Button>
      </div>

      <Card className="mb-4">
        <div className="mb-3 flex flex-wrap items-center gap-1">
          <button onClick={() => withReset(setCategory)(null)} className={tabClass(category === null)}>
            Toate
          </button>
          {NOTIFICATION_CATEGORIES.map((c) => (
            <button key={c} onClick={() => withReset(setCategory)(c)} className={tabClass(category === c)}>
              {c}
              {(unreadByCategory[c] ?? 0) > 0 && (
                <span className="rounded-full bg-critical px-1.5 text-[10px] font-bold text-white">
                  {unreadByCategory[c]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">Tip</label>
            <Select value={type} onChange={(e) => withReset(setType)(e.target.value)} className="w-auto">
              <option value="">Toate tipurile</option>
              {Object.entries(NOTIFICATION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">De la</label>
            <Input type="date" value={from} onChange={(e) => withReset(setFrom)(e.target.value)} className="w-auto" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">Până la</label>
            <Input type="date" value={to} onChange={(e) => withReset(setTo)(e.target.value)} className="w-auto" />
          </div>
          <label className="flex cursor-pointer items-center gap-2 py-2 text-sm text-ink-secondary">
            <input type="checkbox" checked={unreadOnly}
              onChange={(e) => withReset(setUnreadOnly)(e.target.checked)} />
            Doar necitite
          </label>
          {hasFilters && (
            <Button variant="ghost" onClick={clearFilters}>
              Șterge filtrele
            </Button>
          )}
        </div>
      </Card>

      {loading ? (
        <p className="text-ink-secondary">Se încarcă...</p>
      ) : items.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-ink-muted">
            {hasFilters ? "Nicio notificare pentru filtrele alese." : "Nicio notificare încă."}
          </p>
        </Card>
      ) : (
        <>
          <p className="mb-2 text-xs text-ink-muted">
            {total} {total === 1 ? "notificare" : "notificări"}
          </p>
          <div className="space-y-2">
            {items.map((n) => {
              const { Icon, chip } = notificationMeta(n.type);
              return (
                <button
                  key={n.notificationId}
                  onClick={() => handleOpen(n)}
                  className={`flex w-full items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left shadow-sm transition-colors hover:bg-surface-alt/60 ${
                    n.isRead ? "opacity-60" : ""
                  }`}
                >
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${chip}`}>
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{n.title}</p>
                      <Badge tone="neutral">{NOTIFICATION_TYPE_LABELS[n.type] ?? n.type}</Badge>
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-accent" />}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-secondary">{n.message}</p>
                    <p className="mt-1 text-[11px] text-ink-muted" title={formatDateTime(n.createdAt)}>
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button variant="secondary" disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}>
                ‹ Înapoi
              </Button>
              <span className="text-sm text-ink-secondary">
                Pagina {page + 1} din {totalPages}
              </span>
              <Button variant="secondary" disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}>
                Înainte ›
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
