import api from "./api";
import type { SaleListItem } from "../types";

export const saleService = {
  async getAll(): Promise<SaleListItem[]> {
    const { data } = await api.get<SaleListItem[]>("/sales");
    return data;
  },

  async updateChecklist(saleId: number, checklist: { docsHandedOver: boolean; platesDone: boolean; warrantyGiven: boolean }): Promise<void> {
    await api.put(`/sales/${saleId}/checklist`, checklist);
  },
};
