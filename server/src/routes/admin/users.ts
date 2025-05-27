import { ApiResponse, UserRole } from "@/types/api";
import { AuthRequest, authenticateToken, requireRole } from "@/middleware/auth";
import { Response, Router } from "express";
import { discordProfileRepository, userRepository } from "@/database";

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

    // Get all users with Discord profiles
    const users = await userRepository.findAllWithDiscordProfiles(page, limit, search);
    const totalUsers = await userRepository.getTotalCount(search);

    const response: ApiResponse = {
      status: "success",
      message: "Users retrieved successfully",
      data: { 
        users,
        pagination: {
          page,
          limit,
          total: totalUsers,
          pages: Math.ceil(totalUsers / limit)
        }
      }
    };

    res.json(response);
  } catch (error) {
    logger.error("Failed to fetch users", { error });
    
    const response: ApiResponse = {
      status: "error",
      message: "Failed to fetch users"
    };
    
    res.status(500).json(response);
  }
});

// GET /api/admin/users/:userId - Get specific user details
router.get("/:userId", async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await authService.getUserProfile(userId);

    if (!user) {
      const response: ApiResponse = {
        status: "error",
        message: "User not found"
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      status: "success",
      message: "User retrieved successfully",
      data: { user }
    };

    res.json(response);
  } catch (error) {
    logger.error("Failed to fetch user", { error, userId: req.params.userId });
    
    const response: ApiResponse = {
      status: "error",
      message: "Failed to fetch user"
    };
    
    res.status(500).json(response);
  }
});

// PUT /api/admin/users/:userId/role - Update user role
router.put("/:userId/role", async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      const response: ApiResponse = {
        status: "error",
        message: "Invalid role provided",
        errors: { role: "Must be one of: newbie, member, contributor, moderator, admin" }
      };
      return res.status(400).json(response);
    }

    // Prevent non-admins from assigning admin role
    if (role === UserRole.ADMIN && req.user?.role !== UserRole.ADMIN) {
      const response: ApiResponse = {
        status: "error",
        message: "Only admins can assign admin role"
      };
      return res.status(403).json(response);
    }

    // Prevent users from changing their own role
    if (userId === req.user?.userId) {
      const response: ApiResponse = {
        status: "error",
        message: "Cannot change your own role"
      };
      return res.status(403).json(response);
    }

    // Check if user exists
    const existingUser = await userRepository.findById(userId);
    if (!existingUser) {
      const response: ApiResponse = {
        status: "error",
        message: "User not found"
      };
      return res.status(404).json(response);
    }

    // Update user role (this will sync with Discord automatically)
    const success = await authService.updateUserRole(userId, role);

    if (!success) {
      const response: ApiResponse = {
        status: "error",
        message: "Failed to update user role"
      };
      return res.status(500).json(response);
    }

    // Get updated user data
    const updatedUser = await authService.getUserProfile(userId);

    const response: ApiResponse = {
      status: "success",
      message: "User role updated successfully",
      data: { user: updatedUser }
    };

    res.json(response);
  } catch (error) {
    logger.error("Failed to update user role", { 
      error, 
      userId: req.params.userId,
      requestedRole: req.body.role 
    });
    
    const response: ApiResponse = {
      status: "error",
      message: "Failed to update user role"
    };
    
    res.status(500).json(response);
  }
});

// DELETE /api/admin/users/:userId - Soft delete user (deactivate)
router.delete("/:userId", async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Prevent users from deleting themselves
    if (userId === req.user?.userId) {
      const response: ApiResponse = {
        status: "error",
        message: "Cannot delete your own account"
      };
      return res.status(403).json(response);
    }

    // Only admins can delete users
    if (req.user?.role !== UserRole.ADMIN) {
      const response: ApiResponse = {
        status: "error",
        message: "Only admins can delete users"
      };
      return res.status(403).json(response);
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      const response: ApiResponse = {
        status: "error",
        message: "User not found"
      };
      return res.status(404).json(response);
    }

    // For now, we'll just update the role to indicate deletion
    // In a full implementation, you'd add a `deleted_at` column
    const success = await userRepository.softDelete(userId);

    const response: ApiResponse = {
      status: "success",
      message: "User deleted successfully"
    };

    res.json(response);
  } catch (error) {
    logger.error("Failed to delete user", { error, userId: req.params.userId });
    
    const response: ApiResponse = {
      status: "error",
      message: "Failed to delete user"
    };
    
    res.status(500).json(response);
  }
});

// POST /api/admin/users/:userId/sync-discord - Manually sync user with Discord
router.post("/:userId/sync-discord", async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await authService.getUserProfile(userId);
    if (!user) {
      const response: ApiResponse = {
        status: "error",
        message: "User not found"
      };
      return res.status(404).json(response);
    }

    if (!user.discordProfile?.discord_id) {
      const response: ApiResponse = {
        status: "error",
        message: "User has no Discord profile"
      };
      return res.status(400).json(response);
    }

    // Force Discord role sync
    const success = await authService.updateUserRole(userId, user.role);

    const response: ApiResponse = {
      status: "success",
      message: success ? "Discord sync completed" : "Discord sync failed"
    };

    res.json(response);
  } catch (error) {
    logger.error("Failed to sync Discord", { error, userId: req.params.userId });
    
    const response: ApiResponse = {
      status: "error",
      message: "Failed to sync with Discord"
    };
    
    res.status(500).json(response);
  }
});

export { router as adminUsersRouter };