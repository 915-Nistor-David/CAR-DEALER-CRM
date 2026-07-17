import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { notificationService } from "../services/notificationService";
import { BellIcon } from "./icons";
import type { AppNotification } from "../types";

const POLL_MS = 60_000;

// "acum 5 min", "acum 2 h", altfel data
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "chiar acum";
  if (min < 60) return `acum ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `acum ${h} h`;
  return new Date(iso).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = async () => {
    try {
      const data = await notificationService.getMine();
      setUnreadCount(data.unreadCount);
      setItems(data.items);
    } catch {
      // silentios — clopotelul nu trebuie sa strice pagina daca API-ul e jos
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  const handleClick = async (n: AppNotification) => {
    setOpen(false);
    if (!n.isRead) {
      setUnreadCount((c) => Math.max(0, c - 1));
      setItems((list) => list.map((i) => (i.notificationId === n.notificationId ? { ...i, isRead: true } : i)));
      notificationService.markRead(n.notificationId).catch(() => {});
    }
    if (n.linkUrl) navigate(n.linkUrl);
  };

  const handleMarkAll = async () => {
    setUnreadCount(0);
    setItems((list) => list.map((i) => ({ ...i, isRead: true })));
    notificationService.markAllRead().catch(() => {});
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-ink-secondary hover:bg-surface-hover hover:text-ink"
        title="Notificări"
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
          <div className="absolute right-0 z-50 mt-2 w-96 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-sm font-bold text-ink">Notificări</span>
              {unreadCount > 0 && (
                <button onClick={handleMarkAll} className="text-xs font-medium text-accent hover:underline">
                  Marchează toate citite
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-ink-muted">Nicio notificare încă.</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.notificationId}
                    onClick={() => handleClick(n)}
                    className={`block w-full border-b border-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-alt/60 ${
                      n.isRead ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-ink-secondary">{n.message}</p>
                        <p className="mt-1 text-[11px] text-ink-muted">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
