import api from "./api";
import type {
  Cost, CreateSaleRequest, Photo, SaveVehicleRequest, Stage, Vehicle, VehicleDetail,
} from "../types";

export const vehicleService = {
  async getAll(): Promise<Vehicle[]> {
    const { data } = await api.get<Vehicle[]>("/vehicles");
    return data;
  },

  async getById(id: number): Promise<VehicleDetail> {
    const { data } = await api.get<VehicleDetail>(`/vehicles/${id}`);
    return data;
  },

  async create(req: SaveVehicleRequest): Promise<number> {
    const { data } = await api.post<{ vehicleId: number }>("/vehicles", req);
    return data.vehicleId;
  },

  async update(id: number, req: SaveVehicleRequest): Promise<void> {
    await api.put(`/vehicles/${id}`, req);
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/vehicles/${id}`);
  },

  async changeStage(id: number, stageId: number, note?: string): Promise<void> {
    await api.put(`/vehicles/${id}/stage`, { stageId, note: note || null });
  },

  async getStages(): Promise<Stage[]> {
    const { data } = await api.get<Stage[]>("/stages");
    return data;
  },

  async addCost(vehicleId: number, cost: { category: string; amount: number; date: string; description?: string | null }): Promise<Cost> {
    const { data } = await api.post<Cost>(`/vehicles/${vehicleId}/costs`, cost);
    return data;
  },

  async deleteCost(vehicleId: number, costId: number): Promise<void> {
    await api.delete(`/vehicles/${vehicleId}/costs/${costId}`);
  },

  async uploadPhoto(vehicleId: number, file: File, category: string): Promise<Photo> {
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);
    const { data } = await api.post<Photo>(`/vehicles/${vehicleId}/photos`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  async deletePhoto(vehicleId: number, photoId: number): Promise<void> {
    await api.delete(`/vehicles/${vehicleId}/photos/${photoId}`);
  },

  async createSale(vehicleId: number, req: CreateSaleRequest): Promise<void> {
    await api.post(`/vehicles/${vehicleId}/sale`, req);
  },
};
