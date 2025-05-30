import { ApiResponse, UserRole } from "@/types/api";
import { AuthRequest, authenticateToken, requireRole } from "@/middleware/auth";
import { Response, Router } from "express";

import { createLogger } from "@/utils/logger";
import { discordChannelService } from "@/services/discord-channel-service";
import { discordService } from "@/services/discord-service";
import { tagService } from "@/services/tag-service";

const router = Router();
const logger = createLogger("admin-discord");

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/discord/channels - Get available Discord voice channels
router.get(
  "/channels",
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.MODERATOR]),
  async (req, res) => {
    try {
      const channels = await discordChannelService.getVoiceChannels();

      res.json({
        success: true,
        data: channels,
        message: "Discord channels fetched successfully",
      });
    } catch (error: any) {
      console.error("Failed to fetch Discord channels:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch Discord channels",
      });
    }
  },
);

// POST /api/admin/discord/sync-user-tags/:userId - Sync user's tags with Discord
router.post(
  "/sync-user-tags/:userId",
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

      const success = await tagService.syncUserTagsWithDiscord(userId);

      const response: ApiResponse<{ synced: boolean }> = {
        status: "success",
        message: success
          ? "User tags synced with Discord successfully"
          : "Failed to sync user tags with Discord",
        data: { synced: success },
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to sync user tags with Discord", {
        error,
        userId: req.params.userId,
      });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to sync user tags with Discord",
      };

      res.status(500).json(response);
    }
  },
);

// POST /api/admin/discord/cleanup-tag-roles - Cleanup unused tag roles
router.post(
  "/cleanup-tag-roles",
  requireRole([UserRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      await discordService.cleanupUnusedTagRoles();

      const response: ApiResponse = {
        status: "success",
        message: "Tag role cleanup completed successfully",
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to cleanup tag roles", { error });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to cleanup tag roles",
      };

      res.status(500).json(response);
    }
  },
);

// GET /api/admin/discord/bot-permissions - Check bot permissions
router.get(
  "/bot-permissions",
  requireRole([UserRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const permissions = await discordService.checkBotPermissions();

      const response: ApiResponse<typeof permissions> = {
        status: "success",
        message: "Bot permissions retrieved successfully",
        data: permissions,
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to get bot permissions", { error });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to get bot permissions",
      };

      res.status(500).json(response);
    }
  },
);

// GET /api/admin/discord/guild-stats - Get Discord guild statistics
router.get(
  "/guild-stats",
  requireRole([UserRole.ADMIN, UserRole.MODERATOR]),
  async (req: AuthRequest, res: Response) => {
    try {
      const stats = await discordService.getGuildStats();

      const response: ApiResponse<typeof stats> = {
        status: "success",
        message: "Guild statistics retrieved successfully",
        data: stats,
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to get guild stats", { error });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to get guild stats",
      };

      res.status(500).json(response);
    }
  },
);

// POST /api/admin/discord/setup-roles - Setup Discord roles
router.post(
  "/setup-roles",
  requireRole([UserRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const roleIds = await discordService.setupGuildRoles();

      const response: ApiResponse<{ roleIds: typeof roleIds }> = {
        status: "success",
        message: "Discord roles setup completed",
        data: { roleIds },
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to setup Discord roles", { error });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to setup Discord roles",
      };

      res.status(500).json(response);
    }
  },
);

export { router as adminDiscordRouter };
