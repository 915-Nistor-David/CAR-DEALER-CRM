import api from "./api";
import type { NotificationQuery, NotificationsResponse } from "../types";

export const notificationService = {
  async getMine(query: NotificationQuery = {}): Promise<NotificationsResponse> {
    const params: Record<string, string | number | boolean> = {};
    if (query.category) params.category = query.category;
    if (query.type) params.type = query.type;
    if (query.unreadOnly) params.unreadOnly = true;
    if (query.from) params.from = query.from;
    if (query.to) params.to = query.to;
    if (query.skip) params.skip = query.skip;
    if (query.take) params.take = query.take;

    const { data } = await api.get<NotificationsResponse>("/notifications", { params });
    return data;
  },

  async markRead(id: number): Promise<void> {
    await api.put(`/notifications/${id}/read`);
  },

  // Fara categorie marcheaza tot; cu categorie, doar tabul curent.
  async markAllRead(category?: string | null): Promise<void> {
    await api.put("/notifications/read-all", null, {
      params: category ? { category } : undefined,
    });
  },
};
