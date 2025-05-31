import { NextFunction, Request, Response } from "express";

import { AuthService } from "../services/auth.service";
import { logger } from "../utils/logger";

interface ApiResponse<T = any> {
  status: "success" | "error";
  data?: T;
  message: string;
  errors?: Record<string, string>;
}

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    discordId: string;
    discordUsername: string;
    roles: string[];
  };
}

export class AuthMiddleware {
  private authService = new AuthService();

  public authenticateToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
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

      // Verify JWT token
      const decoded = this.authService.verifyToken(token);

      // Attach user info to request
      req.user = {
        userId: decoded.userId,
        discordId: decoded.discordId,
        discordUsername: decoded.discordUsername,
        roles: decoded.roles,
      };

      next();
    } catch (error) {
      logger.warn("Authentication failed:", error);

      // Clear invalid cookie
      res.clearCookie("auth-token");

      const response: ApiResponse = {
        status: "error",
        message: "Authentication failed",
        errors: {
          token:
            error instanceof Error ? error.message : "Invalid or expired token",
        },
      };

      res.status(401).json(response);
    }
  };

  public requireRoles = (requiredRoles: string[]) => {
    return (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction,
    ): void => {
      if (!req.user) {
        const response: ApiResponse = {
          status: "error",
          message: "Authentication required",
          errors: {
            auth: "User not authenticated",
          },
        };

        res.status(401).json(response);
        return;
      }

      const userRoles = req.user.roles;
      const hasRequiredRole = requiredRoles.some((role) =>
        userRoles.includes(role),
      );

      if (!hasRequiredRole) {
        const response: ApiResponse = {
          status: "error",
          message: "Insufficient permissions",
          errors: {
            permissions: `Required roles: ${requiredRoles.join(", ")}. Your roles: ${userRoles.join(", ")}`,
          },
        };

        res.status(403).json(response);
        return;
      }

      next();
    };
  };

  public optionalAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const token = req.cookies["auth-token"];

      if (token) {
        try {
          const decoded = this.authService.verifyToken(token);
          req.user = {
            userId: decoded.userId,
            discordId: decoded.discordId,
            discordUsername: decoded.discordUsername,
            roles: decoded.roles,
          };
        } catch (error) {
          // Clear invalid cookie but don't fail the request
          res.clearCookie("auth-token");
          logger.warn("Optional auth token invalid:", error);
        }
      }

      next();
    } catch (error) {
      // Don't fail the request for optional auth
      logger.warn("Optional auth error:", error);
      next();
    }
  };
}

// Export middleware instances
export const authMiddleware = new AuthMiddleware();
export const authenticateToken = authMiddleware.authenticateToken;
export const requireRoles = authMiddleware.requireRoles;
export const optionalAuth = authMiddleware.optionalAuth;

export type { AuthenticatedRequest };
