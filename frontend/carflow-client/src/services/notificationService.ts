import api from "./api";
import type { NotificationsResponse } from "../types";

export const notificationService = {
  async getMine(): Promise<NotificationsResponse> {
    const { data } = await api.get<NotificationsResponse>("/notifications");
    return data;
  },

  async markRead(id: number): Promise<void> {
    await api.put(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await api.put("/notifications/read-all");
  },
};
