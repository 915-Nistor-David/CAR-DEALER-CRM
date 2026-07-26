import api from "./api";
import type { SaveDocumentRequest } from "../types";

export const documentService = {
  async create(vehicleId: number, req: SaveDocumentRequest): Promise<number> {
    const { data } = await api.post<{ documentId: number }>(`/vehicles/${vehicleId}/documents`, req);
    return data.documentId;
  },

  async update(vehicleId: number, docId: number, req: SaveDocumentRequest): Promise<void> {
    await api.put(`/vehicles/${vehicleId}/documents/${docId}`, req);
  },

  async remove(vehicleId: number, docId: number): Promise<void> {
    await api.delete(`/vehicles/${vehicleId}/documents/${docId}`);
  },
};
