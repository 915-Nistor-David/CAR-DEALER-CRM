import api from "./api";
import type { AuthUser } from "../types";

export const authService = {
  async register(dealershipName: string, name: string, email: string, password: string): Promise<AuthUser> {
    const { data } = await api.post<AuthUser>("/auth/register", { dealershipName, name, email, password });
    saveSession(data);
    return data;
  },

  async login(email: string, password: string): Promise<AuthUser> {
    const { data } = await api.post<AuthUser>("/auth/login", { email, password });
    saveSession(data);
    return data;
  },

  logout() {
    localStorage.removeItem("carflow_token");
    localStorage.removeItem("carflow_user");
  },

  getUser(): AuthUser | null {
    const raw = localStorage.getItem("carflow_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      // Valoare coruptă: se apelează în corpul de render (Navbar, ProtectedRoute),
      // deci o excepție aici ar albi toată aplicația fără cale de ieșire.
      this.logout();
      return null;
    }
  },

  isLoggedIn(): boolean {
    return !!localStorage.getItem("carflow_token");
  },

  getRole(): string {
    return this.getUser()?.role ?? "";
  },

  isOwner(): boolean {
    return this.getRole() === "Owner";
  },

  hasRole(...roles: string[]): boolean {
    return roles.includes(this.getRole());
  },
};

function saveSession(user: AuthUser) {
  localStorage.setItem("carflow_token", user.token);
  localStorage.setItem("carflow_user", JSON.stringify(user));
}
