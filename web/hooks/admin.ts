import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { UserRole } from "@/types/api";
import apiClient from "@/lib/api-client";

const adminApi = {
  getDashboardStats: async () => {
    const response = await apiClient.get("/admin/dashboard/stats");
    return response.data;
  },

  getUsers: async (page = 1, limit = 20, search = "") => {
    const response = await apiClient.get(`/admin/users?page=${page}&limit=${limit}&search=${search}`);
    return response.data;
  },

  getUser: async (userId: string) => {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  },

  updateUserRole: async ({ userId, role }: { userId: string; role: UserRole }) => {
    const response = await apiClient.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  },

  deleteUser: async (userId: string) => {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return response.data;
  },

  syncDiscord: async (userId: string) => {
    const response = await apiClient.post(`/admin/users/${userId}/sync-discord`);
    return response.data;
  },
};

export const useAdminStats = () => {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: adminApi.getDashboardStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAdminUsers = (page: number, limit: number, search: string) => {
  return useQuery({
    queryKey: ["admin", "users", page, limit, search],
    queryFn: () => adminApi.getUsers(page, limit, search),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.updateUserRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
};

export const useSyncDiscord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.syncDiscord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
};