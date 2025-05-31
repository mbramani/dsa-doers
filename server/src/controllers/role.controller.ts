import { ApiResponse, PaginatedResponse } from "../types/api";
import { Request, Response } from "express";

import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { logger } from "../utils/logger";
import { roleService } from "../services/role.service";

export class RoleController {
  public createRole = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const {
        name,
        description,
        color,
        sortOrder,
        isSystemRole,
        discordRoleConfig,
      } = req.body;

      const createdBy = req.user!.userId;

      const result = await roleService.createRole(
        {
          name,
          description,
          color,
          sortOrder,
          isSystemRole,
          discordRoleConfig,
        },
        createdBy,
      );

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || "Failed to create role",
          errors: {
            role: result.error || "Role creation failed",
          },
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        status: "success",
        data: result.data,
        message: "Role created successfully",
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error("Role creation failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to create role",
        errors: {
          server:
            error instanceof Error ? error.message : "Unknown server error",
        },
      };

      res.status(500).json(response);
    }
  };

  public updateRole = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedBy = req.user!.userId;

      const result = await roleService.updateRole(id, updateData, updatedBy);

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || "Failed to update role",
          errors: {
            role: result.error || "Role update failed",
          },
        };
        res
          .status(result.error === "Role not found" ? 404 : 400)
          .json(response);
        return;
      }

      const response: ApiResponse = {
        status: "success",
        data: result.data,
        message: "Role updated successfully",
      };

      res.json(response);
    } catch (error) {
      logger.error("Role update failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to update role",
        errors: {
          server:
            error instanceof Error ? error.message : "Unknown server error",
        },
      };

      res.status(500).json(response);
    }
  };

  public deleteRole = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const deletedBy = req.user!.userId;

      const result = await roleService.deleteRole(id, deletedBy);

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || "Failed to delete role",
          errors: {
            role: result.error || "Role deletion failed",
          },
        };
        res
          .status(result.error === "Role not found" ? 404 : 400)
          .json(response);
        return;
      }

      const response: ApiResponse = {
        status: "success",
        message: "Role deleted successfully",
      };

      res.json(response);
    } catch (error) {
      logger.error("Role deletion failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to delete role",
        errors: {
          server:
            error instanceof Error ? error.message : "Unknown server error",
        },
      };

      res.status(500).json(response);
    }
  };

  public getRoles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page, limit, search, isSystemRole, sortBy, sortOrder, all } =
        req.query;

      const filters = {
        all: all === "true" ? true : false,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        search: search as string,
        isSystemRole:
          isSystemRole === "true"
            ? true
            : isSystemRole === "false"
              ? false
              : undefined,
        sortBy: (sortBy as "name" | "sortOrder" | "createdAt") || "sortOrder",
        sortOrder: (sortOrder as "asc" | "desc") || "asc",
      };

      const result = await roleService.getRoles(filters);

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || "Failed to retrieve roles",
          errors: {
            roles: result.error || "Failed to fetch roles",
          },
        };
        res.status(500).json(response);
        return;
      }

      const { roles, total } = result.data!;
      const totalPages = Math.ceil(total / filters.limit);

      const response: ApiResponse<PaginatedResponse<any>> = {
        status: "success",
        data: {
          data: roles,
          pagination: {
            page: filters.page,
            limit: filters.limit,
            total,
            totalPages,
          },
        },
        message: "Roles retrieved successfully",
      };

      res.json(response);
    } catch (error) {
      logger.error("Get roles failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to retrieve roles",
        errors: {
          server:
            error instanceof Error ? error.message : "Unknown server error",
        },
      };

      res.status(500).json(response);
    }
  };

  public getRoleById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await roleService.getRoleById(id);

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || "Failed to retrieve role",
          errors: {
            role: result.error || "Role not found",
          },
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        status: "success",
        data: result.data,
        message: "Role retrieved successfully",
      };

      res.json(response);
    } catch (error) {
      logger.error("Get role by ID failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to retrieve role",
        errors: {
          server:
            error instanceof Error ? error.message : "Unknown server error",
        },
      };

      res.status(500).json(response);
    }
  };

  public assignRole = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const { userId, roleNames, reason, syncWithDiscord } = req.body;
      const grantedBy = req.user!.userId;

      const result = await roleService.applyRoleToUser({
        userId,
        roleNames,
        grantedBy,
        reason,
        syncWithDiscord,
      });

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || "Failed to assign roles",
          errors: {
            assignment: result.error || "Role assignment failed",
          },
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        status: "success",
        data: {
          appliedRoles: result.appliedRoles,
          skippedRoles: result.skippedRoles,
        },
        message: `Successfully assigned ${result.appliedRoles.length} role(s)${result.skippedRoles.length > 0 ? `, skipped ${result.skippedRoles.length} existing role(s)` : ""}`,
      };

      res.json(response);
    } catch (error) {
      logger.error("Role assignment failed:", error);

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

  public revokeRole = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const { userId, roleNames, reason, syncWithDiscord } = req.body;
      const revokedBy = req.user!.userId;

      const result = await roleService.removeRoleFromUser({
        userId,
        roleNames,
        revokedBy,
        reason,
        syncWithDiscord: syncWithDiscord ?? true,
      });

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || "Failed to revoke roles",
          errors: {
            revocation: result.error || "Role revocation failed",
          },
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        status: "success",
        data: {
          revokedRoles: result.revokedRoles,
          skippedRoles: result.skippedRoles,
        },
        message: `Successfully revoked ${result.revokedRoles.length} role(s)${result.skippedRoles.length > 0 ? `, skipped ${result.skippedRoles.length} role(s) (user didn't have them)` : ""}`,
      };

      res.json(response);
    } catch (error) {
      logger.error("Role revocation failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to revoke roles",
        errors: {
          server:
            error instanceof Error ? error.message : "Unknown server error",
        },
      };

      res.status(500).json(response);
    }
  };
}

export const roleController = new RoleController();
