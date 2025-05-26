import { Router } from "express";
import { discordAuthRouter } from "./auth/discord";

const router: Router = Router();

// Auth routes
router.use("/auth/discord", discordAuthRouter);

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export { router as appRoutes };
