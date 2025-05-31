import type { ApiResponse, User } from "@/types/auth";
import axios, { type AxiosResponse } from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Auth service with proper typing
export const authService = {
  me: (): Promise<AxiosResponse<ApiResponse<User>>> =>
    apiClient.get("/auth/me"),

  logout: (): Promise<AxiosResponse<ApiResponse<void>>> =>
    apiClient.post("/auth/logout"),

  loginWithDiscord: (): void => {
    window.location.href = `${API_BASE_URL}/auth/discord`;
  },
};

export default apiClient;
