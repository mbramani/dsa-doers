import { ApiResponse, AuthResult, AuthUser } from "@/types/api";
import { Request, Response, Router } from "express";

import { authService } from "@/services/auth-service";
import config from "@/utils/config";
import { createLogger } from "@/utils/logger";
import { discordService } from "@/services/discord-service";

const router: Router = Router();
const logger = createLogger("discord-auth");

// GET /api/auth/discord - Get Discord OAuth URL
router.get("/", (req: Request, res: Response) => {
  try {
    const authUrl: string = discordService.getAuthUrl();

    const response: ApiResponse<{ authUrl: string }> = {
      status: "success",
      message: "Discord auth URL generated successfully",
      data: { authUrl },
    };

    res.json(response);
  } catch (error) {
    logger.error("Failed to generate Discord auth URL", { error });

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
      logger.warn("Discord OAuth error", { error });
      return res.redirect(
        `${config.env.frontend.url}/auth/error?error=${error}`,
      );
    }

    if (!code || typeof code !== "string") {
      logger.warn("Missing or invalid OAuth code", { code });
      return res.redirect(
        `${config.env.frontend.url}/auth/error?error=missing_code`,
      );
    }

    const authResult: AuthResult =
      await authService.authenticateWithDiscord(code);

    // Set HTTP-only cookie with JWT token
    res.cookie("auth-token", authResult.token, {
      httpOnly: true,
      secure: config.env.server.environment === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to frontend with success status
    const redirectUrl = new URL(`${config.env.frontend.url}/auth/success`);

    if (authResult.isNewUser) {
      redirectUrl.searchParams.set("newUser", "true");
    }

    if (authResult.discordInviteUrl) {
      redirectUrl.searchParams.set("inviteUrl", authResult.discordInviteUrl);
    }

    logger.info("Discord OAuth callback successful", {
      userId: authResult.user.id,
      isNewUser: authResult.isNewUser,
    });

    res.redirect(redirectUrl.toString());
  } catch (error) {
    logger.error("Discord OAuth callback error", {
      error: error instanceof Error ? error.message : error,
      query: req.query,
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
        message: "No authentication token provided",
      };
      return res.status(401).json(response);
    }

    const decoded = authService.verifyToken(token) as any;
    const user: AuthUser | null = await authService.getUserProfile(
      decoded.userId,
    );

    if (!user) {
      const response: ApiResponse = {
        status: "error",
        message: "User not found",
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<{ user: AuthUser }> = {
      status: "success",
      message: "User profile retrieved successfully",
      data: { user },
    };

    res.json(response);
  } catch (error) {
    logger.error("Failed to get user profile", { error });

    const response: ApiResponse = {
      status: "error",
      message: "Invalid or expired token",
    };

    res.status(401).json(response);
  }
});

// POST /api/auth/discord/logout - Logout user
router.post("/logout", (req: Request, res: Response) => {
  try {
    // Clear the auth cookie
    res.clearCookie("auth-token", {
      httpOnly: true,
      secure: config.env.server.environment === "production",
      sameSite: "lax",
      path: "/",
    });

    const response: ApiResponse = {
      status: "success",
      message: "Logged out successfully",
    };

    res.json(response);
  } catch (error) {
    logger.error("Logout error", { error });

    const response: ApiResponse = {
      status: "error",
      message: "Failed to logout",
    };

    res.status(500).json(response);
  }
});

// POST /api/auth/discord/refresh - Refresh user data from Discord
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const token = req.cookies["auth-token"];

    if (!token) {
      const response: ApiResponse = {
        status: "error",
        message: "No authentication token provided",
      };
      return res.status(401).json(response);
    }

    const decoded = authService.verifyToken(token) as any;
    const success: boolean = await authService.syncUserWithDiscord(
      decoded.userId,
    );

    const response: ApiResponse<{ synced: boolean }> = {
      status: "success",
      message: success
        ? "User data refreshed successfully"
        : "Failed to refresh user data",
      data: { synced: success },
    };

    res.json(response);
  } catch (error) {
    logger.error("Failed to refresh user data", { error });

    const response: ApiResponse = {
      status: "error",
      message: "Failed to refresh user data",
    };

    res.status(500).json(response);
  }
});

export { router as discordAuthRouter };
