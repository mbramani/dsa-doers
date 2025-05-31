import { authenticateToken, requireRoles } from "../middleware/auth.middleware";

import { AuthController } from "../controllers/auth.controller";
import { Router } from "express";
import { discordCallbackSchema } from "../schemas/auth.validation";
import { validateRequest } from "../middleware/validation.middleware";

const router = Router();
const authController = new AuthController();

// Public routes
router.get("/discord", authController.initiateDiscordOAuth);
router.get(
  "/discord/callback",
  validateRequest(discordCallbackSchema),
  authController.handleDiscordCallback,
);

// Protected routes
router.get("/me", authenticateToken, authController.getCurrentUser);
router.post("/logout", authController.logout);
router.post("/refresh", authController.refreshToken);

// Admin only routes
router.get("/users", authenticateToken, requireRoles(["ADMIN"]), (req, res) => {
  // Get all users route
  res.json({ message: "Admin users endpoint" });
});

export { router as authRoutes };
