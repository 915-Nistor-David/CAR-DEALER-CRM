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
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },

  isLoggedIn(): boolean {
    return !!localStorage.getItem("carflow_token");
  },
};

function saveSession(user: AuthUser) {
  localStorage.setItem("carflow_token", user.token);
  localStorage.setItem("carflow_user", JSON.stringify(user));
}
