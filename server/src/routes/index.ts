import { ApiResponse } from "@/types/api";
import { Router } from "express";
import { adminDashboardRouter } from "./admin/dashboard";
import { adminDiscordRouter } from "./admin/discord";
import { adminTagsRouter } from "./admin/tags";
import { adminUsersRouter } from "./admin/users";
import { discordAuthRouter } from "./auth/discord";
import { publicTagsRouter } from "./public/tags";

const router: Router = Router();

// Public routes (no auth required)
router.use("/public/tags", publicTagsRouter);

// Auth routes
router.use("/auth/discord", discordAuthRouter);

// Admin routes (auth required)
router.use("/admin/users", adminUsersRouter);
router.use("/admin/dashboard", adminDashboardRouter);
router.use("/admin/tags", adminTagsRouter);
router.use("/admin/discord", adminDiscordRouter);

// Health check
router.get("/health", (req, res) => {
  const response: ApiResponse<{
    status: string;
    timestamp: string;
    uptime: number;
    environment: string;
  }> = {
    status: "success",
    message: "Server is healthy",
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    },
  };

  res.json(response);
});

// 404 handler for API routes
router.use("*", (req, res) => {
  const response: ApiResponse = {
    status: "error",
    message: `Route ${req.method} ${req.originalUrl} not found`,
  };

  res.status(404).json(response);
});

export { router as appRoutes };
