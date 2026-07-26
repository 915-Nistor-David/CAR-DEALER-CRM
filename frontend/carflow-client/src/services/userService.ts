import api from "./api";
import type { CreateUserRequest, ManagedUser } from "../types";

export const userService = {
  async getAll(): Promise<ManagedUser[]> {
    const { data } = await api.get<ManagedUser[]>("/users");
    return data;
  },

  async create(req: CreateUserRequest): Promise<number> {
    const { data } = await api.post<{ userId: number }>("/users", req);
    return data.userId;
  },

  async update(id: number, role: string, isActive: boolean): Promise<void> {
    await api.put(`/users/${id}`, { role, isActive });
  },
};
