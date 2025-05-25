import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AuthUser } from "@workspace/types/api";
import { authApi } from "@workspace/api/auth";

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
    staleTime: 5 * 60 * 1000, // 5 minutes
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
