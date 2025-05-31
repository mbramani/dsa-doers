import { Role, User, UserRole } from "@prisma/client";

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, any>;
}

// Create a type for User with relations
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
