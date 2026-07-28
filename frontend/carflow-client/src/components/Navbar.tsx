import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { ChevronDownIcon, MenuIcon, SearchIcon } from "./icons";
import NotificationBell from "./NotificationBell";
import MobileNav from "./MobileNav";

export interface NavItem {
  to: string;
  label: string;
}

// Sursa unica pentru ambele meniuri (bara de desktop si drawerul de mobil),
// ca sa nu poata ajunge sa difere pe roluri.
function navItems(): { main: NavItem[]; admin: NavItem[] } {
  const main: NavItem[] = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/board", label: "Board" },
    { to: "/vehicles", label: "Mașini" },
    { to: "/agenda", label: "Agendă" },
  ];
  if (authService.hasRole("Owner", "Vanzari")) main.push({ to: "/sales", label: "Vânzări" });

  // Paginile de administrare stau intr-un dropdown pe desktop: cu toate cele 8
  // linkuri desfasurate bara avea nevoie de ~1451px si depasea si pe 1440px.
  const admin: NavItem[] = authService.isOwner()
    ? [
        { to: "/activitate", label: "Activitate" },
        { to: "/etape", label: "Etape" },
        { to: "/utilizatori", label: "Utilizatori" },
      ]
    : [];

  return { main, admin };
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-accent/15 text-accent-hover ring-1 ring-accent/40"
      : "text-ink-secondary hover:bg-surface-hover hover:text-ink"
  }`;

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getUser();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { main, admin } = navItems();

  // Drawerul se inchide la schimbarea rutei — altfel ar rămâne deschis peste
  // pagina noua dupa un click pe link.
  useEffect(() => setMenuOpen(false), [location.pathname]);

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
        <div className="flex h-14 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-6">
            <Link to="/dashboard" className="flex min-h-11 shrink-0 items-center gap-2.5 sm:min-h-0">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#8b6bff] to-[#5b34d9] text-sm font-bold text-white">
                C
              </span>
              <span className="text-lg font-semibold tracking-tight text-ink">CarFlow</span>
            </Link>
            {/* Sub lg linkurile stau in drawer (vezi MobileNav). */}
            <div className="hidden items-center gap-1 lg:flex">
              {main.map((item) => (
                <NavLink key={item.to} to={item.to} className={linkClass}>
                  {item.label}
                </NavLink>
              ))}
              {admin.length > 0 && <AdminMenu items={admin} />}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="relative hidden xl:block">
              <SearchIcon
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="Caută o mașină..."
                aria-label="Caută o mașină"
                className="w-44 rounded-full border border-border bg-surface py-1.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent 2xl:w-52"
              />
            </div>
            <NotificationBell />
            {user && (
              <span className="hidden min-w-0 max-w-52 truncate text-sm text-ink-secondary lg:block">
                {user.name}
                {/* Numele dealerului dubleaza lungimea — doar de la xl, unde incape. */}
                <span className="hidden xl:inline">
                  {" · "}
                  <span className="text-ink-muted">{user.dealershipName}</span>
                </span>
              </span>
            )}
            <button
              onClick={handleLogout}
              className="hidden rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-ink-secondary hover:bg-surface-hover hover:text-ink lg:block"
            >
              Deconectare
            </button>
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Deschide meniul"
              aria-expanded={menuOpen}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-ink-secondary hover:bg-surface-hover hover:text-ink lg:hidden"
            >
              <MenuIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <MobileNav
          main={main}
          admin={admin}
          user={user}
          onClose={() => setMenuOpen(false)}
          onLogout={handleLogout}
        />
      )}
    </nav>
  );
}

// Grupeaza paginile de Owner pe desktop, ca bara sa incapa. Aceeasi logica de
// inchidere ca la clopotel: backdrop invizibil + Escape + schimbare de ruta.
function AdminMenu({ items }: { items: NavItem[] }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const active = items.some((i) => location.pathname === i.to);

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
          active || open
            ? "bg-accent/15 text-accent-hover ring-1 ring-accent/40"
            : "text-ink-secondary hover:bg-surface-hover hover:text-ink"
        }`}
      >
        Administrare
        <ChevronDownIcon size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute left-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-xl"
          >
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-accent/10 font-medium text-accent-hover"
                      : "text-ink-secondary hover:bg-surface-alt hover:text-ink"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
