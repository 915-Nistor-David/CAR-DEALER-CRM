import api from "./api";
import type { DealerSettings, SaveStageRequest, Stage } from "../types";

export const stageService = {
  async getAll(): Promise<Stage[]> {
    const { data } = await api.get<Stage[]>("/stages");
    return data;
  },

  async create(req: SaveStageRequest): Promise<number> {
    const { data } = await api.post<{ stageId: number }>("/stages", req);
    return data.stageId;
  },

  async update(id: number, req: SaveStageRequest): Promise<void> {
    await api.put(`/stages/${id}`, req);
  },

  async reorder(stageIds: number[]): Promise<void> {
    await api.put("/stages/reorder", { stageIds });
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/stages/${id}`);
  },

  async getSettings(): Promise<DealerSettings> {
    const { data } = await api.get<DealerSettings>("/settings");
    return data;
  },

  async updateSettings(settings: DealerSettings): Promise<void> {
    await api.put("/settings", settings);
  },
};
