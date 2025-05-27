import {
  ApiResponse,
  AuthUser,
  PaginatedResponse,
  UserRole,
} from "@/types/api";
import { AuthRequest, authenticateToken, requireRole } from "@/middleware/auth";
import { Response, Router } from "express";

import { authService } from "@/services/auth-service";
import { createLogger } from "@/utils/logger";

const router = Router();
const logger = createLogger("admin-users");

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireRole([UserRole.ADMIN, UserRole.MODERATOR]));

// GET /api/admin/users - List all users with their Discord profiles
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      const errors: Record<string, string> = {};
      if (page < 1) {
        errors.page = "Page must be >= 1";
      }
      if (limit < 1 || limit > 100) {
        errors.limit = "Limit must be between 1 and 100";
      }

      const response: ApiResponse = {
        status: "error",
        message: "Invalid pagination parameters",
        errors,
      };
      return res.status(400).json(response);
    }

    const result = await authService.getAllUsers(page, limit, search);

    const response: ApiResponse<PaginatedResponse<AuthUser>> = {
      status: "success",
      message: "Users retrieved successfully",
      data: {
        data: result.users,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: result.pages,
          hasNext: page < result.pages,
          hasPrev: page > 1,
        },
      },
    };

    res.json(response);
  } catch (error) {
    logger.error("Failed to fetch users", { error, query: req.query });

    const response: ApiResponse = {
      status: "error",
      message: "Failed to fetch users",
    };

    res.status(500).json(response);
  }
});

// GET /api/admin/users/:userId - Get specific user details
router.get("/:userId", async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Validate userId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      const response: ApiResponse = {
        status: "error",
        message: "Invalid user ID format",
        errors: { userId: "Must be a valid UUID" },
      };
      return res.status(400).json(response);
    }

    const user: AuthUser | null = await authService.getUserProfile(userId);

    if (!user) {
      const response: ApiResponse = {
        status: "error",
        message: "User not found",
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<{ user: AuthUser }> = {
      status: "success",
      message: "User retrieved successfully",
      data: { user },
    };

    res.json(response);
  } catch (error) {
    logger.error("Failed to fetch user", { error, userId: req.params.userId });

    const response: ApiResponse = {
      status: "error",
      message: "Failed to fetch user",
    };

    res.status(500).json(response);
  }
});

// PUT /api/admin/users/:userId/role - Update user role
router.put("/:userId/role", async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate userId format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      const response: ApiResponse = {
        status: "error",
        message: "Invalid user ID format",
        errors: { userId: "Must be a valid UUID" },
      };
      return res.status(400).json(response);
    }

    // Validate role
    if (!role || !Object.values(UserRole).includes(role)) {
      const response: ApiResponse = {
        status: "error",
        message: "Invalid role provided",
        errors: {
          role: `Must be one of: ${Object.values(UserRole).join(", ")}`,
        },
      };
      return res.status(400).json(response);
    }

    // Prevent self-role changes for admins
    if (
      req.user?.userId === userId &&
      req.user?.role === UserRole.ADMIN &&
      role !== UserRole.ADMIN
    ) {
      const response: ApiResponse = {
        status: "error",
        message: "Cannot change your own admin role",
      };
      return res.status(403).json(response);
    }

    // Only admins can assign admin or moderator roles
    if (
      (role === UserRole.ADMIN || role === UserRole.MODERATOR) &&
      req.user?.role !== UserRole.ADMIN
    ) {
      const response: ApiResponse = {
        status: "error",
        message: "Only admins can assign admin or moderator roles",
      };
      return res.status(403).json(response);
    }

    const success: boolean = await authService.updateUserRole(userId, role);

    if (!success) {
      const response: ApiResponse = {
        status: "error",
        message: "Failed to update user role",
      };
      return res.status(500).json(response);
    }

    const response: ApiResponse<{ updated: boolean; newRole: UserRole }> = {
      status: "success",
      message: "User role updated successfully",
      data: { updated: true, newRole: role },
    };

    res.json(response);
  } catch (error) {
    logger.error("Failed to update user role", {
      error,
      userId: req.params.userId,
      role: req.body.role,
    });

    const response: ApiResponse = {
      status: "error",
      message: "Failed to update user role",
    };

    res.status(500).json(response);
  }
});

// DELETE /api/admin/users/:userId - Soft delete user
router.delete(
  "/:userId",
  requireRole([UserRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      // Validate userId format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        const response: ApiResponse = {
          status: "error",
          message: "Invalid user ID format",
          errors: { userId: "Must be a valid UUID" },
        };
        return res.status(400).json(response);
      }

      // Prevent self-deletion
      if (req.user?.userId === userId) {
        const response: ApiResponse = {
          status: "error",
          message: "Cannot delete your own account",
        };
        return res.status(403).json(response);
      }

      const success: boolean = await authService.softDeleteUser(userId);

      if (!success) {
        const response: ApiResponse = {
          status: "error",
          message: "User not found or already deleted",
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse<{ deleted: boolean; reason?: string }> = {
        status: "success",
        message: "User deleted successfully",
        data: { deleted: true, reason },
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to delete user", {
        error,
        userId: req.params.userId,
        reason: req.body.reason,
      });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to delete user",
      };

      res.status(500).json(response);
    }
  },
);

// POST /api/admin/users/:userId/discord/remove - Remove Discord access
router.post(
  "/:userId/discord/remove",
  requireRole([UserRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      // Validate userId format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        const response: ApiResponse = {
          status: "error",
          message: "Invalid user ID format",
          errors: { userId: "Must be a valid UUID" },
        };
        return res.status(400).json(response);
      }

      const success: boolean = await authService.removeUserDiscordAccess(
        userId,
        reason,
      );

      const response: ApiResponse<{ removed: boolean; reason?: string }> = {
        status: "success",
        message: success
          ? "Discord access removed successfully"
          : "User has no Discord access to remove",
        data: { removed: success, reason },
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to remove Discord access", {
        error,
        userId: req.params.userId,
        reason: req.body.reason,
      });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to remove Discord access",
      };

      res.status(500).json(response);
    }
  },
);

// POST /api/admin/users/:userId/sync - Sync user with Discord
router.post(
  "/:userId/sync",
  requireRole([UserRole.ADMIN, UserRole.MODERATOR]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;

      // Validate userId format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        const response: ApiResponse = {
          status: "error",
          message: "Invalid user ID format",
          errors: { userId: "Must be a valid UUID" },
        };
        return res.status(400).json(response);
      }

      const success: boolean = await authService.syncUserWithDiscord(userId);

      const response: ApiResponse<{ synced: boolean }> = {
        status: "success",
        message: success
          ? "User synced with Discord successfully"
          : "Failed to sync user with Discord",
        data: { synced: success },
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to sync user with Discord", {
        error,
        userId: req.params.userId,
      });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to sync user with Discord",
      };

      res.status(500).json(response);
    }
  },
);

export { router as adminUsersRouter };
