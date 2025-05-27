import { ApiResponse, UserRole } from "@/types/api";
import { AuthRequest, authenticateToken, requireRole } from "@/middleware/auth";
import { Response, Router } from "express";

import { createLogger } from "@/utils/logger";
import { userRepository } from "@/database";

const router = Router();
const logger = createLogger("admin-dashboard");

router.use(authenticateToken);
router.use(requireRole([UserRole.ADMIN, UserRole.MODERATOR]));

// GET /api/admin/dashboard/stats - Get dashboard statistics
router.get("/stats", async (req: AuthRequest, res: Response) => {
  try {
    const stats = await userRepository.getDashboardStats();

    const response: ApiResponse = {
      status: "success",
      message: "Dashboard stats retrieved",
      data: { stats }
    };

    res.json(response);
  } catch (error) {
    logger.error("Failed to get dashboard stats", { error });
    
    const response: ApiResponse = {
      status: "error",
      message: "Failed to get dashboard stats"
    };
    
    res.status(500).json(response);
  }
});

export { router as adminDashboardRouter };