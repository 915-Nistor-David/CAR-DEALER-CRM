import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { notificationService } from "../services/notificationService";
import { notificationMeta, timeAgo } from "../utils/notificationMeta";
import { BellIcon } from "./icons";
import { NOTIFICATION_CATEGORIES } from "../types";
import type { AppNotification } from "../types";

const POLL_MS = 60_000;

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null); // null = toate
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByCategory, setUnreadByCategory] = useState<Record<string, number>>({});
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = async (cat = category) => {
    try {
      const data = await notificationService.getMine({ category: cat, take: 20 });
      setUnreadCount(data.unreadCount);
      setUnreadByCategory(data.unreadByCategory);
      setItems(data.items);
    } catch {
      // silentios — clopotelul nu trebuie sa strice pagina daca API-ul e jos
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => load(), POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const handleClick = async (n: AppNotification) => {
    setOpen(false);
    if (!n.isRead) {
      setUnreadCount((c) => Math.max(0, c - 1));
      setUnreadByCategory((m) => ({ ...m, [n.category]: Math.max(0, (m[n.category] ?? 1) - 1) }));
      setItems((list) => list.map((i) => (i.notificationId === n.notificationId ? { ...i, isRead: true } : i)));
      notificationService.markRead(n.notificationId).catch(() => {});
    }
    if (n.linkUrl) navigate(n.linkUrl);
  };

  // Marcheaza doar tabul curent daca e selectat unul.
  const handleMarkAll = async () => {
    if (category) {
      const cleared = unreadByCategory[category] ?? 0;
      setUnreadCount((c) => Math.max(0, c - cleared));
      setUnreadByCategory((m) => ({ ...m, [category]: 0 }));
    } else {
      setUnreadCount(0);
      setUnreadByCategory({});
    }
    setItems((list) => list.map((i) => ({ ...i, isRead: true })));
    notificationService.markAllRead(category).catch(() => {});
  };

  const tabClass = (active: boolean) =>
    `flex min-h-9 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
      active ? "bg-accent/15 text-accent" : "text-ink-secondary hover:bg-surface-hover hover:text-ink"
    }`;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-ink-secondary hover:bg-surface-hover hover:text-ink sm:h-9 sm:w-9"
        title="Notificări"
        aria-label="Notificări"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <BellIcon size={17} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-critical px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Pe telefon panoul nu poate fi un dropdown ancorat la clopotel: cu w-96
              (384px) era mai lat decat ecranul, iar `right-0` raportat la clopotel
              (care nu e la marginea din dreapta — hamburgerul e dupa el) scotea o
              bucata in afara marginii din stanga, de unde nu se poate recupera.
              Sub sm il fixam la viewport, cu 8px de gard pe fiecare parte.
              De la sm redevine dropdown normal sub clopotel.
              Inaltimea pe dvh + flex-col ca subsolul „Vezi toate" sa nu mai fie tăiat:
              panoul e intr-un nav `sticky`, deci scroll-ul paginii nu l-ar aduce in vizor. */}
          <div
            role="dialog"
            aria-label="Notificări"
            className="fixed left-2 right-2 top-14 z-50 flex max-h-[calc(100dvh-4.5rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:max-h-[calc(100dvh-5rem)] sm:w-96"
          >
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-4 py-2.5">
              <span className="min-w-0 truncate text-sm font-bold text-ink">Notificări</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10"
                >
                  {category ? `Marchează „${category}” citit` : "Marchează toate citite"}
                </button>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-3 py-2">
              <button onClick={() => setCategory(null)} className={tabClass(category === null)}>
                Toate
              </button>
              {NOTIFICATION_CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={tabClass(category === c)}>
                  {c}
                  {(unreadByCategory[c] ?? 0) > 0 && (
                    <span className="rounded-full bg-critical px-1.5 text-[10px] font-bold text-white">
                      {unreadByCategory[c]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-ink-muted">
                  {category ? `Nicio notificare la „${category}”.` : "Nicio notificare încă."}
                </p>
              ) : (
                items.map((n) => {
                  const { Icon, chip } = notificationMeta(n.type);
                  return (
                    <button
                      key={n.notificationId}
                      onClick={() => handleClick(n)}
                      className={`block w-full border-b border-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-alt/60 ${
                        n.isRead ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${chip}`}>
                          <Icon size={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{n.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-ink-secondary">{n.message}</p>
                          <p className="mt-1 text-[11px] text-ink-muted">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <Link
              to="/notificari"
              onClick={() => setOpen(false)}
              className="block shrink-0 border-t border-border px-4 py-3 text-center text-xs font-medium text-accent hover:bg-surface-alt/60"
            >
              Vezi toate notificările
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
