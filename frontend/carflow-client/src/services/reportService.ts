import api from "./api";
import type { ActivityReport } from "../types";

export const reportService = {
  async activity(from?: string, to?: string): Promise<ActivityReport> {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const { data } = await api.get<ActivityReport>(`/reports/activity?${params.toString()}`);
    return data;
  },
};
