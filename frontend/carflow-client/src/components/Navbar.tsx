import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { SearchIcon } from "./icons";
import NotificationBell from "./NotificationBell";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
    isActive
      ? "bg-accent/15 text-accent-hover ring-1 ring-accent/40"
      : "text-ink-secondary hover:bg-surface-hover hover:text-ink"
  }`;

export default function Navbar() {
  const navigate = useNavigate();
  const user = authService.getUser();
  const [query, setQuery] = useState("");

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !query.trim()) return;
    navigate(`/vehicles?q=${encodeURIComponent(query.trim())}`);
    setQuery("");
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-page/80 backdrop-blur-md">
      <div className="w-full px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#8b6bff] to-[#5b34d9] text-sm font-bold text-white">
                C
              </span>
              <span className="text-lg font-semibold tracking-tight text-ink">CarFlow</span>
            </Link>
            <div className="flex items-center gap-1">
              <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
              <NavLink to="/board" className={linkClass}>Board</NavLink>
              <NavLink to="/vehicles" className={linkClass}>Mașini</NavLink>
              {authService.hasRole("Owner", "Vanzari") && (
                <NavLink to="/sales" className={linkClass}>Vânzări</NavLink>
              )}
              {authService.isOwner() && (
                <>
                  <NavLink to="/activitate" className={linkClass}>Activitate</NavLink>
                  <NavLink to="/etape" className={linkClass}>Etape</NavLink>
                  <NavLink to="/utilizatori" className={linkClass}>Utilizatori</NavLink>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden lg:block">
              <SearchIcon
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="Caută o mașină..."
                className="w-52 rounded-full border border-border bg-surface py-1.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <NotificationBell />
            {user && (
              <span className="hidden sm:block text-sm text-ink-secondary">
                {user.name} · <span className="text-ink-muted">{user.dealershipName}</span>
              </span>
            )}
            <button
              onClick={handleLogout}
              className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-ink-secondary hover:bg-surface-hover hover:text-ink"
            >
              Deconectare
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
