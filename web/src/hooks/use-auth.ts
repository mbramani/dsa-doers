import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AxiosError } from "axios";
import type { User } from "@/types/auth";
import { authService } from "@/services/api";

// Auth query hook
export const useAuthQuery = () => {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async (): Promise<User | null> => {
      try {
        const response = await authService.me();
        if (response.data.status === "success" && response.data.data) {
          return response.data.data;
        }
        return null;
      } catch (error) {
        if ((error as AxiosError)?.response?.status === 401) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

// Logout mutation hook
export const useLogoutMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      // Redirect to home
      window.location.href = "/";
    },
    onError: (error) => {
      console.error("Logout failed:", error);
      // Even if logout fails on server, clear local cache
      queryClient.clear();
      window.location.href = "/";
    },
  });
};

// Login helper (just redirects)
export const useLogin = () => {
  return {
    login: authService.loginWithDiscord,
    isLoading: false, // Since it's just a redirect
  };
};
