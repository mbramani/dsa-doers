import { NextFunction, Request, Response } from "express";

import { UserRole } from "@/types/api";
import { authService } from "@/services/auth-service";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    discordId: string;
    role: UserRole;
  };
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies["auth-token"];
    
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "No authentication token"
      });
    }

    const decoded = authService.verifyToken(token) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      status: "error", 
      message: "Invalid token"
    });
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Insufficient permissions"
      });
    }
    next();
  };
}