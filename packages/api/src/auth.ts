import { ApiResponse, AuthUser } from "@workspace/types/api";

import apiClient from "./client";

export const authApi = {
  getAuthUrl: async (): Promise<ApiResponse<{ authUrl: string }>> => {
    const response = await apiClient.get("/auth/discord");
    return response.data;
  },

  getCurrentUser: async (): Promise<ApiResponse<{ user: AuthUser }>> => {
    const response = await apiClient.get("/auth/discord/me");
    return response.data;
  },

  logout: async (): Promise<ApiResponse> => {
    const response = await apiClient.post("/auth/discord/logout");
    return response.data;
  },
};
