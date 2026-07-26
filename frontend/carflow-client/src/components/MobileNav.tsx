import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate } from "react-router-dom";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { CloseIcon, SearchIcon } from "./icons";
import type { NavItem } from "./Navbar";
import type { AuthUser } from "../types";

interface Props {
  main: NavItem[];
  admin: NavItem[];
  user: AuthUser | null;
  onClose: () => void;
  onLogout: () => void;
}

// Meniul de navigare pentru telefon si tableta (sub lg). Bara orizontala are
// nevoie de ~1451px cu tot afisat pentru un Owner, deci sub lg linkurile stau aici.
// Randat prin portal in body: panoul navului are z-40, iar un drawer randat
// inauntru ar ramane prins in acel context de stacking.
export default function MobileNav({ main, admin, user, onClose, onLogout }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useBodyScrollLock(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !query.trim()) return;
    navigate(`/vehicles?q=${encodeURIComponent(query.trim())}`);
    setQuery("");
    onClose();
  };

  // min-h-11 (44px): tinta minima rezonabila pentru un deget.
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 items-center rounded-xl px-3 text-base font-medium transition-colors ${
      isActive
        ? "bg-accent/15 text-accent-hover ring-1 ring-accent/40"
        : "text-ink-secondary hover:bg-surface-hover hover:text-ink"
    }`;

  return createPortal(
    <div className="lg:hidden">
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Meniu"
        className="fixed inset-y-0 right-0 z-50 flex h-dvh w-[min(20rem,85vw)] flex-col border-l border-border bg-surface shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-bold text-ink">Meniu</span>
          <button
            onClick={onClose}
            aria-label="Închide meniul"
            className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-alt hover:text-ink"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          {/* Pe telefon cautarea nu exista deloc azi — era `hidden lg:block` in bara. */}
          <div className="relative mb-3">
            <SearchIcon
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="Caută o mașină..."
              aria-label="Caută o mașină"
              className="min-h-11 w-full rounded-xl border border-border bg-surface-alt py-2 pl-9 pr-3 text-base text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <nav className="flex flex-col gap-1">
            {main.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass} onClick={onClose}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {admin.length > 0 && (
            <>
              <p className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Administrare
              </p>
              <nav className="flex flex-col gap-1">
                {admin.map((item) => (
                  <NavLink key={item.to} to={item.to} className={linkClass} onClick={onClose}>
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-4 py-3">
          {user && (
            <div className="mb-2 min-w-0">
              <p className="truncate text-sm font-medium text-ink">{user.name}</p>
              <p className="truncate text-xs text-ink-muted">{user.dealershipName}</p>
            </div>
          )}
          <button
            onClick={onLogout}
            className="min-h-11 w-full rounded-xl border border-border bg-surface-alt px-3 text-sm font-medium text-ink-secondary hover:bg-surface-hover hover:text-ink"
          >
            Deconectare
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
