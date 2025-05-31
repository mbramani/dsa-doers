import { Role, User, UserRole } from "@prisma/client";

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, any>;
}
