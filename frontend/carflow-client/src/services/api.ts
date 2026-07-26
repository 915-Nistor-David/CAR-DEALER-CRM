import axios from "axios";

// Configurabil la build prin VITE_API_URL (vezi .env.example) — hardcodarea
// lui localhost facea aplicatia inutilizabila pe orice deploy real.
export const API_ORIGIN = import.meta.env.VITE_API_URL ?? "http://localhost:5100";

const api = axios.create({ baseURL: `${API_ORIGIN}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("carflow_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.startsWith("/login")) {
      localStorage.removeItem("carflow_token");
      localStorage.removeItem("carflow_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const assetUrl = (path?: string | null) =>
  path ? `${API_ORIGIN}/${path}` : undefined;

export default api;
