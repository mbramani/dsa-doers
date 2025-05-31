export interface User {
  id: string;
  discordId: string;
  discordUsername: string;
  discordAvatar?: string;
  email?: string;
  roles: Role[];
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  color?: string;
  grantedAt: string;
  isSystemGranted: boolean;
}

export interface ApiResponse<T = unknown> {
  status: "success" | "error";
  data?: T;
  message: string;
  errors?: Record<string, string>;
}
