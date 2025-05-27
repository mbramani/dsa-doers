import { ApiResponse, DashboardStats, UserRole } from "@/types/api";
import { AuthRequest, authenticateToken, requireRole } from "@/middleware/auth";
import { Response, Router } from "express";

import { authService } from "@/services/auth-service";
import { createLogger } from "@/utils/logger";
import { discordService } from "@/services/discord-service";
import { tagService } from "@/services/tag-service";

const router = Router();
const logger = createLogger("admin-dashboard");

router.use(authenticateToken);
router.use(requireRole([UserRole.ADMIN, UserRole.MODERATOR]));

// GET /api/admin/dashboard/stats - Get dashboard statistics
router.get("/stats", async (req: AuthRequest, res: Response) => {
  try {
    const [userStats, tagStats, discordStats] = await Promise.all([
      authService.getDashboardStats(),
      tagService.getTagStats(),
      discordService.getGuildStats().catch(() => null),
    ]);

    const stats = {
      users: userStats,
      tags: tagStats,
      discord: discordStats,
    };

    const response: ApiResponse<{ stats: typeof stats }> = {
      status: "success",
      message: "Dashboard stats retrieved successfully",
      data: { stats },
    };

    res.json(response);
  } catch (error) {
    logger.error("Failed to get dashboard stats", { error });

    const response: ApiResponse = {
      status: "error",
      message: "Failed to get dashboard stats",
    };

    res.status(500).json(response);
  }
});

export { router as adminDashboardRouter };
