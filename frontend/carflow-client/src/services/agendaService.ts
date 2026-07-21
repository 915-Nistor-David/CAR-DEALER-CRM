import api from "./api";
import type { AgendaResponse } from "../types";

export const agendaService = {
  async get(from?: string, to?: string): Promise<AgendaResponse> {
    const { data } = await api.get<AgendaResponse>("/agenda", {
      params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
    });
    return data;
  },
};
