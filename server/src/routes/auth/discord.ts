import { Request, Response, Router } from "express";

import { ApiResponse } from "@/types/api";
import { authService } from "@/services/auth-service";
import config from "@/utils/config";
import { createLogger } from "@/utils/logger";
import { discordService } from "@/services/discord-service";

const router: Router = Router();
const logger = createLogger("discord-auth");

// GET /api/auth/discord - Get Discord OAuth URL
router.get("/", (req: Request, res: Response) => {
  try {
    const authUrl = discordService.getAuthUrl();

    const response: ApiResponse = {
      status: "success",
      message: "Discord auth URL generated",
      data: { authUrl },
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      status: "error",
      message: "Failed to generate auth URL",
    };

    res.status(500).json(response);
  }
});

// GET /api/auth/discord/callback - Handle Discord OAuth callback
router.get("/callback", async (req: Request, res: Response) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.redirect(`${config.env.frontend.url}/auth/error?error=${error}`);
    }

    if (!code || typeof code !== "string") {
      return res.redirect(
        `${config.env.frontend.url}/auth/error?error=missing_code`,
      );
    }

    const authResult = await authService.authenticateWithDiscord(code);

    // Set HTTP-only cookie with JWT token
    res.cookie("auth-token", authResult.token, {
      httpOnly: true,
      secure: config.env.server.environment === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    // Redirect to frontend with success status
    const redirectUrl = new URL(`${config.env.frontend.url}/auth/success`);

    if (authResult.isNewUser) {
      redirectUrl.searchParams.set("newUser", "true");
    }

    if (authResult.discordInviteUrl) {
      redirectUrl.searchParams.set("inviteUrl", authResult.discordInviteUrl);
    }

    res.redirect(redirectUrl.toString());
  } catch (error) {
    logger.error("Discord OAuth callback error", {
      error: error instanceof Error ? error.message : error,
    });
    res.redirect(`${config.env.frontend.url}/auth/error?error=auth_failed`);
  }
});

// GET /api/auth/discord/me - Get current user info
router.get("/me", async (req: Request, res: Response) => {
  try {
    const token = req.cookies["auth-token"];

    if (!token) {
      const response: ApiResponse = {
        status: "error",
        message: "No authentication token",
      };
      return res.status(401).json(response);
    }

    const decoded = authService.verifyToken(token) as any;
    const user = await authService.getUserProfile(decoded.userId);

    if (!user) {
      const response: ApiResponse = {
        status: "error",
        message: "User not found",
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      status: "success",
      message: "User profile retrieved",
      data: { user },
    };

    res.json(response);
  } catch (error) {
    res.clearCookie("auth-token");
    const response: ApiResponse = {
      status: "error",
      message: "Invalid token",
    };
    res.status(401).json(response);
  }
});

// POST /api/auth/discord/logout
router.post("/logout", (req: Request, res: Response) => {
  try {
    res.clearCookie("auth-token", { path: "/" });

    const response: ApiResponse = {
      status: "success",
      message: "Logged out successfully",
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      status: "error",
      message: "Logout failed",
    };
    res.status(500).json(response);
  }
});

export { router as discordAuthRouter };
