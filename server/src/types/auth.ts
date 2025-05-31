import { Role, User, UserRole } from "@prisma/client";

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  email?: string;
  global_name?: string;
}

export interface DiscordTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface JWTPayload {
  userId: string;
  discordId: string;
  discordUsername: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  user: any;
  isNewUser: boolean;
  token: string;
}

export type UserWithRoles = User & {
  userRoles: (UserRole & {
    role: Role;
  })[];
};

export interface CreateUserResult {
  user: UserWithRoles;
  isNewUser: boolean;
}

export interface TokenStoreResult {
  success: boolean;
  error?: string;
}

export interface DiscordServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}
