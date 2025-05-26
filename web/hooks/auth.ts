import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AuthUser } from "@/types/api";
import apiClient from "../lib/api-client";

const authApi = {
  getAuthUrl: async () => {
    const response = await apiClient.get("/auth/discord");
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get("/auth/discord/me");
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post("/auth/logout");
    return response.data;
  },
};

export const useAuth = () => {
  return useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      try {
        const response = await authApi.getCurrentUser();
        return response.data?.user || null;
      } catch (error: any) {
        if (
          error.status === "error" &&
          error.message === "No authentication token"
        ) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDiscordAuth = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await authApi.getAuthUrl();
      if (response.data?.authUrl) {
        window.location.href = response.data.authUrl;
      }
      return response;
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(["auth", "user"], null);
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
};
