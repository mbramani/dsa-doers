import { ApiResponse, PaginatedResponse } from "../types/api";
import { ApplyRoleResult, RemoveRoleResult } from "../types/role";
import { UserAnalytics, userService } from "../services/user.service";

import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { Response } from "express";
import { UserFilters } from "../schemas/user.validation";
import { UserWithRoles } from "../types/auth";
import { logger } from "../utils/logger";

export class UserController {
  public getUserAnalytics = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const result = await userService.getUserAnalytics();

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || "Failed to get user analytics",
          errors: { analytics: result.error || "Failed to retrieve analytics" },
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse<UserAnalytics> = {
        status: "success",
        data: result.data,
        message: "User analytics retrieved successfully",
      };

      res.json(response);
    } catch (error) {
      logger.error("Get user analytics failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to get user analytics",
        errors: {
          server:
            error instanceof Error ? error.message : "Unknown server error",
        },
      };

      res.status(500).json(response);
    }
  };

  public getUsers = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const filters = req.query as unknown as UserFilters;

      const safeFilters: UserFilters = {
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        search: filters.search,
        role: filters.role,
        status: filters.status || "active",
        registeredAfter: filters.registeredAfter,
        registeredBefore: filters.registeredBefore,
        sortBy: filters.sortBy || "createdAt",
        sortOrder: filters.sortOrder || "desc",
      };

      const result = await userService.getUsers(safeFilters);

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || "Failed to get users",
          errors: { users: result.error || "Failed to retrieve users" },
        };
        res.status(400).json(response);
        return;
      }

      const { users, total } = result.data!;
      const totalPages = Math.ceil(total / filters.limit);

      const response: ApiResponse<PaginatedResponse<UserWithRoles>> = {
        status: "success",
        data: {
          data: users,
          pagination: {
            page: filters.page,
            limit: filters.limit,
            total,
            totalPages,
          },
        },
        message: "Users retrieved successfully",
      };

      res.json(response);
    } catch (error) {
      logger.error("Get users failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to get users",
        errors: {
          server:
            error instanceof Error ? error.message : "Unknown server error",
        },
      };

      res.status(500).json(response);
    }
  };

  public updateUserStatus = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const { action, reason } = req.body;
      const adminId = req.user!.userId;

      const result = await userService.updateUserStatus(
        userId,
        action,
        reason,
        adminId,
      );

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || `Failed to ${action} user`,
          errors: { user: result.error || `Failed to ${action} user` },
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse<UserWithRoles> = {
        status: "success",
        data: result.data,
        message: `User ${action}d successfully`,
      };

      res.json(response);
    } catch (error) {
      logger.error("Update user status failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to update user status",
        errors: {
          server:
            error instanceof Error ? error.message : "Unknown server error",
        },
      };

      res.status(500).json(response);
    }
  };

  public assignRoles = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const { roleNames, reason, syncWithDiscord } = req.body;
      const adminId = req.user!.userId;

      const result = await userService.assignRoles(
        userId,
        roleNames,
        reason,
        adminId,
        syncWithDiscord,
      );

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || "Failed to assign roles",
          errors: { roles: result.error || "Failed to assign roles" },
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse<ApplyRoleResult> = {
        status: "success",
        data: result.data,
        message: `Roles assigned successfully`,
      };

      res.json(response);
    } catch (error) {
      logger.error("Assign roles failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to assign roles",
        errors: {
          server:
            error instanceof Error ? error.message : "Unknown server error",
        },
      };

      res.status(500).json(response);
    }
  };

  public removeRole = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const { userId, roleId } = req.params;
      const { reason } = req.body;
      const adminId = req.user!.userId;

      const result = await userService.removeRole(
        userId,
        roleId,
        reason,
        adminId,
      );

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || "Failed to remove role",
          errors: { role: result.error || "Failed to remove role" },
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse<RemoveRoleResult> = {
        status: "success",
        data: result.data,
        message: "Role removed successfully",
      };

      res.json(response);
    } catch (error) {
      logger.error("Remove role failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to remove role",
        errors: {
          server:
            error instanceof Error ? error.message : "Unknown server error",
        },
      };

      res.status(500).json(response);
    }
  };

  public forceSyncUser = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const adminId = req.user!.userId;

      const result = await userService.forceSyncUser(userId, reason, adminId);

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || "Failed to sync user",
          errors: { sync: result.error || "Failed to sync user" },
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse<{
        added: string[];
        removed: string[];
        errors: string[];
      }> = {
        status: "success",
        data: result.data,
        message: "User synced successfully",
      };

      res.json(response);
    } catch (error) {
      logger.error("Force sync user failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to sync user",
        errors: {
          server:
            error instanceof Error ? error.message : "Unknown server error",
        },
      };

      res.status(500).json(response);
    }
  };
}

export const userController = new UserController();
