import axios, { AxiosResponse } from "axios";

import { ApiResponse } from "@/types/api";

const getBaseURL = () => {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
};

export const apiClient = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  timeout: 30000,
});

apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    return response;
  },
  (error) => {
    if (error.response?.data) {
      return Promise.reject(error.response.data);
    }
    return Promise.reject({
      status: "error",
      message: error.message || "Network error",
    });
  },
);

export default apiClient;
