import type { Role, UserFilters } from "@/types/admin";
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

export const useRoles = (params?: { all?: boolean; search?: string }) => {
  return useQuery({
    queryKey: ["admin", "roles", params],
    queryFn: async (): Promise<Role[]> => {
      try {
        const response = await adminService.getRoles({ all: true, ...params });
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
