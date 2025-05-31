import type {
  CreateRoleData,
  PaginatedRoles,
  PaginatedUsers,
  Role,
  RoleAssignmentResult,
  RoleFilters,
  SyncResult,
  UpdateRoleData,
  UserAnalytics,
  UserFilters,
  UserWithRoles,
} from "@/types/admin";

import type { ApiResponse } from "@/types/auth";
import apiClient from "./api";

export const adminService = {
  // User management
  getUsers: (filters: Partial<UserFilters>) =>
    apiClient.get<ApiResponse<PaginatedUsers>>("/users", { params: filters }),

  getUserAnalytics: () =>
    apiClient.get<ApiResponse<UserAnalytics>>("/users/analytics"),

  updateUserStatus: (
    userId: string,
    action: "archive" | "restore",
    reason: string,
  ) =>
    apiClient.patch<ApiResponse<UserWithRoles>>(`/users/${userId}/status`, {
      action,
      reason,
    }),

  assignRoles: (
    userId: string,
    roleNames: string[],
    reason: string,
    syncWithDiscord = true,
  ) =>
    apiClient.post<ApiResponse<RoleAssignmentResult>>(
      `/users/${userId}/roles`,
      {
        roleNames,
        reason,
        syncWithDiscord,
      },
    ),

  removeRole: (userId: string, roleId: string, reason: string) =>
    apiClient.post<ApiResponse<RoleAssignmentResult>>(
      `/users/${userId}/roles/${roleId}`,
      { reason },
    ),

  syncUser: (userId: string, reason: string) =>
    apiClient.post<ApiResponse<SyncResult>>(`/users/${userId}/sync`, {
      reason,
    }),

  // Role management
  getRoles: (params?: Partial<RoleFilters>) =>
    apiClient.get<ApiResponse<PaginatedRoles>>("/roles", { params }),

  getRoleById: (roleId: string) =>
    apiClient.get<ApiResponse<Role>>(`/roles/${roleId}`),

  createRole: (roleData: CreateRoleData) =>
    apiClient.post<ApiResponse<Role>>("/roles", roleData),

  updateRole: (roleId: string, roleData: UpdateRoleData) =>
    apiClient.put<ApiResponse<Role>>(`/roles/${roleId}`, roleData),

  deleteRole: (roleId: string) =>
    apiClient.delete<ApiResponse<void>>(`/roles/${roleId}`),

  // Role assignment via roles endpoint
  assignRoleViaRoles: (
    userId: string,
    roleNames: string[],
    reason: string,
    syncWithDiscord = true,
  ) =>
    apiClient.post<ApiResponse<RoleAssignmentResult>>("/roles/assign", {
      userId,
      roleNames,
      reason,
      syncWithDiscord,
    }),

  revokeRoleViaRoles: (
    userId: string,
    roleNames: string[],
    reason: string,
    syncWithDiscord = true,
  ) =>
    apiClient.post<ApiResponse<RoleAssignmentResult>>("/roles/revoke", {
      userId,
      roleNames,
      reason,
      syncWithDiscord,
    }),
};
