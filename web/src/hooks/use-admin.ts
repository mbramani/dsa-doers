import type {
  CreateRoleData,
  Role,
  RoleFilters,
  UpdateRoleData,
  UserFilters,
} from "@/types/admin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminService } from "@/services/admin-api";
import { toast } from "sonner";

export const useUserAnalytics = () => {
  return useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: async () => {
      const response = await adminService.getUserAnalytics();
      return response.data.status === "success" ? response.data.data : null;
    },
  });
};

export const useUsers = (filters: Partial<UserFilters>) => {
  return useQuery({
    queryKey: ["admin", "users", filters],
    queryFn: async () => {
      const response = await adminService.getUsers(filters);
      return response.data.status === "success" ? response.data.data : null;
    },
  });
};

export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      action,
      reason,
    }: {
      userId: string;
      action: "archive" | "restore";
      reason: string;
    }) => adminService.updateUserStatus(userId, action, reason),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });

      toast.success(`User ${variables.action}d successfully`, {
        description: `User has been ${variables.action}d. Reason: ${variables.reason}`,
        icon: variables.action === "archive" ? "📦" : "🔄",
      });
    },
    onError: (error, variables) => {
      toast.error(`Failed to ${variables.action} user`, {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        icon: "❌",
      });
    },
  });
};

export const useAssignRoles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      roleNames,
      reason,
      syncWithDiscord,
    }: {
      userId: string;
      roleNames: string[];
      reason: string;
      syncWithDiscord?: boolean;
    }) =>
      adminService.assignRoleViaRoles(
        userId,
        roleNames,
        reason,
        syncWithDiscord,
      ),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });

      toast.success("Roles assigned successfully", {
        description: `${variables.roleNames.length} role(s) assigned: ${variables.roleNames.join(", ")}${variables.syncWithDiscord ? " (Synced with Discord)" : ""}`,
        icon: "➕",
      });
    },
    onError: (error, variables) => {
      toast.error("Failed to assign roles", {
        description: `Could not assign ${variables.roleNames.join(", ")}. ${error instanceof Error ? error.message : "Please try again."}`,
        icon: "❌",
      });
    },
  });
};

export const useRevokeRoles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      roleNames,
      reason,
      syncWithDiscord,
    }: {
      userId: string;
      roleNames: string[];
      reason: string;
      syncWithDiscord?: boolean;
    }) =>
      adminService.revokeRoleViaRoles(
        userId,
        roleNames,
        reason,
        syncWithDiscord,
      ),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });

      toast.success("Roles removed successfully", {
        description: `${variables.roleNames.length} role(s) removed: ${variables.roleNames.join(", ")}${variables.syncWithDiscord ? " (Synced with Discord)" : ""}`,
        icon: "➖",
      });
    },
    onError: (error, variables) => {
      toast.error("Failed to remove roles", {
        description: `Could not remove ${variables.roleNames.join(", ")}. ${error instanceof Error ? error.message : "Please try again."}`,
        icon: "❌",
      });
    },
  });
};

export const useSyncUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminService.syncUser(userId, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

      // Handle the sync result if it's returned in the response
      const syncResult = data?.data?.data;
      if (syncResult) {
        toast.success("User synced successfully", {
          description: `Added: ${syncResult.added?.length || 0} roles, Removed: ${syncResult.removed?.length || 0} roles${syncResult.errors?.length ? `, Errors: ${syncResult.errors.length}` : ""}`,
          icon: "🔄",
        });
      } else {
        toast.success("User sync completed", {
          description: `User roles have been synchronized with Discord`,
          icon: "🔄",
        });
      }
    },
    onError: (error) => {
      toast.error("Failed to sync user", {
        description: `Could not sync user with Discord. ${error instanceof Error ? error.message : "Please try again."}`,
        icon: "❌",
      });
    },
  });
};

export const useRoles = (params?: Partial<RoleFilters>) => {
  return useQuery({
    queryKey: ["admin", "roles", params],
    queryFn: async (): Promise<Role[]> => {
      try {
        const response = await adminService.getRoles({
          all: true,
          ...params,
        });
        if (response.data.status === "success") {
          return response.data.data?.data || [];
        }
        return [];
      } catch (error) {
        toast.error("Failed to load roles", {
          description:
            error instanceof Error
              ? error.message
              : "Could not fetch roles data",
          icon: "❌",
        });
        throw error;
      }
    },
  });
};

export const useRoleById = (roleId: string) => {
  return useQuery({
    queryKey: ["admin", "roles", roleId],
    queryFn: async (): Promise<Role | null> => {
      try {
        const response = await adminService.getRoleById(roleId);
        if (response.data.status === "success") {
          return response.data.data || null;
        }
        return null;
      } catch (error) {
        toast.error("Failed to load role", {
          description:
            error instanceof Error
              ? error.message
              : "Could not fetch role data",
          icon: "❌",
        });
        throw error;
      }
    },
    enabled: !!roleId,
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleData: CreateRoleData) => adminService.createRole(roleData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      toast.success("Role created successfully!", {
        description: `Role "${variables.name}" has been created with ${variables.discordRoleConfig.permissions.length} permission(s)`,
        icon: "✅",
      });
    },
    onError: (error, variables) => {
      toast.error("Failed to create role", {
        description: `Could not create role "${variables.name}". ${error instanceof Error ? error.message : "Please try again"}`,
        icon: "❌",
      });
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roleId,
      ...roleData
    }: { roleId: string } & UpdateRoleData) =>
      adminService.updateRole(roleId, roleData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "roles", variables.roleId],
      });
      toast.success("Role updated successfully!", {
        description: `Role has been updated${variables.name ? ` to "${variables.name}"` : ""}`,
        icon: "✅",
      });
    },
    onError: (error) => {
      toast.error("Failed to update role", {
        description: `Could not update role. ${error instanceof Error ? error.message : "Please try again"}`,
        icon: "❌",
      });
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleId: string) => adminService.deleteRole(roleId),
    onSuccess: (data, roleId) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      queryClient.removeQueries({ queryKey: ["admin", "roles", roleId] });
      toast.success("Role deleted successfully!", {
        description: "The role has been permanently removed",
        icon: "🗑️",
      });
    },
    onError: (error) => {
      toast.error("Failed to delete role", {
        description: `Could not delete role. ${error instanceof Error ? error.message : "Please try again"}`,
        icon: "❌",
      });
    },
  });
};
