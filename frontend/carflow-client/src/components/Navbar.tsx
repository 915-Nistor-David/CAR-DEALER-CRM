import { Link, NavLink, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? "bg-accent text-white" : "text-ink-secondary hover:bg-surface-hover hover:text-ink"
  }`;

export default function Navbar() {
  const navigate = useNavigate();
  const user = authService.getUser();

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  return (
    <nav className="border-b border-border bg-surface-alt shadow">
      <div className="w-full px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2">
              <span className="text-xl">🚗</span>
              <span className="text-lg font-bold tracking-tight text-ink">CarFlow</span>
            </Link>
            <div className="flex items-center gap-1">
              <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
              <NavLink to="/board" className={linkClass}>Board</NavLink>
              <NavLink to="/vehicles" className={linkClass}>Mașini</NavLink>
              <NavLink to="/sales" className={linkClass}>Vânzări</NavLink>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden sm:block text-sm text-ink-secondary">
                {user.name} · <span className="text-ink-muted">{user.dealershipName}</span>
              </span>
            )}
            <button
              onClick={handleLogout}
              className="rounded-md bg-surface px-3 py-1.5 text-sm text-ink-secondary hover:bg-surface-hover hover:text-ink"
            >
              Deconectare
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
