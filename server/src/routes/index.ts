import { Router } from "express";
import { adminDashboardRouter } from "./admin/dashboard";
import { adminUsersRouter } from "./admin/users";
import { discordAuthRouter } from "./auth/discord";

const router: Router = Router();

// Auth routes
router.use("/auth/discord", discordAuthRouter);

// Admin routes
router.use("/admin/users", adminUsersRouter);
router.use("/admin/dashboard", adminDashboardRouter);

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export { router as appRoutes };
