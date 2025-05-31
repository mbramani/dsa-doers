import { Request, Response } from "express";

import { ApiResponse } from "../types/api";
import { activityService } from "../services/activity.service";
import { authService } from "../services/auth.service";
import { logger } from "../utils/logger";
import { serverConfig } from "../utils/config";

export class AuthController {
  public initiateDiscordOAuth = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const authUrl = authService.getDiscordAuthUrl();

      // Log OAuth initiation
      await activityService.logActivity({
        actorType: "SYSTEM",
        actionType: "OAUTH_INITIATED",
        entityType: "AUTH",
        details: {
          provider: "discord",
          userAgent: req.get("User-Agent"),
          referer: req.get("Referer"),
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.redirect(authUrl);
    } catch (error) {
      logger.error("OAuth initiation failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to initiate OAuth",
        errors: {
          oauth:
            error instanceof Error ? error.message : "OAuth initiation failed",
        },
      };

      res.status(500).json(response);
    }
  };

  public handleDiscordCallback = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const { code } = req.query;

      if (!code || typeof code !== "string") {
        const response: ApiResponse = {
          status: "error",
          message: "Invalid callback parameters",
          errors: {
            code: "Authorization code is required",
          },
        };

        res.status(400).json(response);
        return;
      }

      // Handle Discord callback
      const result = await authService.handleDiscordCallback(code);

      if (!result.success) {
        // Log failed authentication
        await activityService.logActivity({
          actorType: "SYSTEM",
          actionType: "LOGIN_FAILED",
          entityType: "AUTH",
          details: {
            provider: "discord",
            error: result.error,
            code: code,
          },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        // Redirect to error page with error info
        const errorUrl = new URL(`${process.env.FRONTEND_URL}/auth/error`);
        errorUrl.searchParams.set(
          "message",
          result.error || "Authentication failed",
        );

        res.redirect(errorUrl.toString());
        return;
      }

      const { user, isNewUser, token } = result.data!;

      // Set HTTP-only cookie
      res.cookie("auth-token", token, {
        httpOnly: true,
        secure: serverConfig.nodeEnv === "production",
        sameSite: serverConfig.nodeEnv === "production" ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      // Log successful authentication
      await activityService.logActivity({
        actorId: user.id,
        actorType: "USER",
        actionType: "LOGIN_SUCCESS",
        entityType: "USER",
        entityId: user.id,
        details: {
          provider: "discord",
          isNewUser: isNewUser,
          discordId: user.discordId,
          discordUsername: user.discordUsername,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Redirect to dashboard
      const redirectUrl = new URL(
        process.env.FRONTEND_URL || "http://localhost:3001/dashboard",
      );
      if (isNewUser) {
        redirectUrl.searchParams.set("newUser", "true");
      }

      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error("OAuth callback failed:", error);

      // Log failed authentication
      await activityService.logActivity({
        actorType: "SYSTEM",
        actionType: "LOGIN_FAILED",
        entityType: "AUTH",
        details: {
          provider: "discord",
          error: error instanceof Error ? error.message : "Unknown error",
          code: req.query.code,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      const errorUrl = new URL(
        `${process.env.FRONTEND_URL || "http://localhost:3001"}/auth/error`,
      );
      errorUrl.searchParams.set(
        "message",
        "Authentication failed due to an unexpected error",
      );

      res.redirect(errorUrl.toString());
    }
  };

  public getCurrentUser = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const token = req.cookies["auth-token"];

      if (!token) {
        const response: ApiResponse = {
          status: "error",
          message: "Authentication required",
          errors: {
            auth: "No authentication token provided",
          },
        };

        res.status(401).json(response);
        return;
      }

      // Verify and decode token
      const decoded = authService.verifyToken(token);
      const userResult = await authService.getUserById(decoded.userId);

      if (!userResult.success) {
        // Clear invalid cookie
        res.clearCookie("auth-token");

        const response: ApiResponse = {
          status: "error",
          message: userResult.error || "User not found",
          errors: {
            user: userResult.error || "Failed to retrieve user data",
          },
        };

        res.status(404).json(response);
        return;
      }

      const user = userResult.data!;

      const response: ApiResponse = {
        status: "success",
        data: {
          id: user.id,
          discordId: user.discordId,
          discordUsername: user.discordUsername,
          discordAvatar: user.discordAvatar,
          email: user.email,
          roles: user.userRoles.map((ur: any) => ({
            id: ur.role.id,
            name: ur.role.name,
            color: ur.role.color,
            grantedAt: ur.grantedAt,
            isSystemGranted: ur.isSystemGranted,
          })),
        },
        message: "User data retrieved successfully",
      };

      res.json(response);
    } catch (error) {
      logger.error("Get current user failed:", error);

      // Clear invalid cookie
      res.clearCookie("auth-token");

      const response: ApiResponse = {
        status: "error",
        message: "Failed to get user data",
        errors: {
          auth:
            error instanceof Error && error.message.includes("token")
              ? "Invalid or expired token"
              : "Authentication verification failed",
        },
      };

      res.status(401).json(response);
    }
  };

  public logout = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get user from token before clearing it
      const token = req.cookies["auth-token"];
      let userId: string | undefined;

      if (token) {
        try {
          const decoded = authService.verifyToken(token);
          userId = decoded.userId;
        } catch (error) {
          logger.warn("Invalid token during logout:", error);
        }
      }

      if (userId) {
        await activityService.logActivity({
          actorId: userId,
          actorType: "USER",
          actionType: "LOGOUT",
          entityType: "USER",
          entityId: userId,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });
      }

      // Clear the HTTP-only cookie
      res.clearCookie("auth-token", {
        httpOnly: true,
        secure: serverConfig.nodeEnv === "production",
        sameSite: serverConfig.nodeEnv === "production" ? "none" : "lax",
      });

      const response: ApiResponse = {
        status: "success",
        message: "Logged out successfully",
      };

      res.json(response);
    } catch (error) {
      logger.error("Logout failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Logout failed",
        errors: {
          logout:
            error instanceof Error ? error.message : "Logout process failed",
        },
      };

      res.status(500).json(response);
    }
  };

  public refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentToken = req.cookies["auth-token"];

      if (!currentToken) {
        const response: ApiResponse = {
          status: "error",
          message: "No token to refresh",
          errors: {
            token: "Authentication token is required for refresh",
          },
        };

        res.status(401).json(response);
        return;
      }

      // Verify current token
      const decoded = authService.verifyToken(currentToken);
      const userResult = await authService.getUserById(decoded.userId);

      if (!userResult.success) {
        res.clearCookie("auth-token");

        const response: ApiResponse = {
          status: "error",
          message: userResult.error || "User not found",
        };

        res.status(404).json(response);
        return;
      }

      const user = userResult.data!;

      // Generate new token with updated user data
      const newToken = authService.generateJWT({
        userId: user.id,
        discordId: user.discordId,
        discordUsername: user.discordUsername,
        roles: user.userRoles.map((ur: any) => ur.role.name),
      });

      // Set new HTTP-only cookie
      res.cookie("auth-token", newToken, {
        httpOnly: true,
        secure: serverConfig.nodeEnv === "production",
        sameSite: serverConfig.nodeEnv === "production" ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      // Log token refresh
      await activityService.logActivity({
        actorId: user.id,
        actorType: "USER",
        actionType: "TOKEN_REFRESHED",
        entityType: "USER",
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      const response: ApiResponse = {
        status: "success",
        message: "Token refreshed successfully",
      };

      res.json(response);
    } catch (error) {
      logger.error("Token refresh failed:", error);

      // Clear invalid cookie
      res.clearCookie("auth-token");

      const response: ApiResponse = {
        status: "error",
        message: "Failed to refresh token",
        errors: {
          token:
            error instanceof Error ? error.message : "Token refresh failed",
        },
      };

      res.status(401).json(response);
    }
  };
}
