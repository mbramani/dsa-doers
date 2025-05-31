export interface ApiResponse<T = any> {
  status: "success" | "error";
  data?: T;
  message: string;
  errors?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
