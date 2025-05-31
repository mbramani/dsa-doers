export interface Role {
  id: string;
  name: string;
  description: string;
  discordRoleId: string;
  sortOrder: number;
  isArchived: boolean;
  color: string;
  isSystemRole: boolean;
  createdAt: string;
  updatedAt: string;
  userRoles: RoleUserRole[];
}

export interface RoleUserRole {
  id: string;
  userId: string;
  roleId: string;
  grantedAt: string;
  grantedBy: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  grantReason: string;
  revokeReason: string | null;
  isSystemGranted: boolean;
  user: {
    id: string;
    discordUsername: string;
    discordAvatar: string | null;
  };
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  grantedAt: string;
  grantedBy: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  grantReason: string;
  revokeReason: string | null;
  isSystemGranted: boolean;
  role: {
    id: string;
    name: string;
    description: string;
    discordRoleId: string;
    sortOrder: number;
    isArchived: boolean;
    color: string;
    isSystemRole: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export interface UserWithRoles {
  id: string;
  discordId: string;
  discordUsername: string;
  discordDiscriminator: string;
  discordAvatar: string | null;
  email: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  userRoles: UserRole[];
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  archivedUsers: number;
  newUsersThisMonth: number;
  roleDistribution: Array<{
    roleName: string;
    count: number;
  }>;
  registrationTrend: Array<{
    date: string;
    count: number;
  }>;
}

export interface UserFilters {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  status: "active" | "archived" | "all";
  registeredAfter?: string;
  registeredBefore?: string;
  sortBy: "createdAt" | "discordUsername" | "lastActivity";
  sortOrder: "asc" | "desc";
}

export interface PaginatedUsers {
  data: UserWithRoles[];
  pagination: {
    page: string;
    limit: string;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedRoles {
  data: Role[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RoleAssignmentResult {
  appliedRoles: string[];
  skippedRoles: string[];
}

export interface SyncResult {
  added: string[];
  removed: string[];
  errors: string[];
}
