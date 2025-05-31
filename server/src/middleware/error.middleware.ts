import { NextFunction, Request, Response } from "express";

import { ZodError } from "zod";
import { logger } from "../utils/logger";

interface ApiResponse<T = any> {
  status: "success" | "error";
  data?: T;
  message: string;
  errors?: Record<string, string>;
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  logger.error("Error occurred:", {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Default error response
  let statusCode = 500;
  let response: ApiResponse = {
    status: "error",
    message: "Internal server error",
  };

  if (err instanceof ZodError) {
    statusCode = 400;
    const errors: Record<string, string> = {};
    err.errors.forEach((error) => {
      const path = error.path.join(".");
      errors[path] = error.message;
    });

    response = {
      status: "error",
      message: "Validation failed",
      errors,
    };
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    response = {
      status: "error",
      message: "Invalid token",
      errors: {
        token: "The provided token is invalid",
      },
    };
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    response = {
      status: "error",
      message: "Token expired",
      errors: {
        token: "The provided token has expired",
      },
    };
  } else if (err.code === "P2002") {
    // Prisma unique constraint error
    statusCode = 409;
    response = {
      status: "error",
      message: "Resource already exists",
      errors: {
        duplicate: "A resource with this value already exists",
      },
    };
  } else if (err.code === "P2025") {
    // Prisma record not found error
    statusCode = 404;
    response = {
      status: "error",
      message: "Resource not found",
      errors: {
        notFound: "The requested resource was not found",
      },
    };
  } else {
    // Log unknown errors for debugging
    logger.error("Unknown error type:", err);

    // In development, include error details
    if (process.env.NODE_ENV === "development") {
      response.errors = {
        details: err.message,
        stack: err.stack,
      };
    } else {
      response.errors = {
        server: "An unexpected error occurred",
      };
    }
  }

  res.status(statusCode).json(response);
};

// 404 handler for routes
export const notFoundHandler = (req: Request, res: Response): void => {
  const response: ApiResponse = {
    status: "error",
    message: "Route not found",
    errors: {
      route: `${req.method} ${req.originalUrl} not found`,
    },
  };

  res.status(404).json(response);
};
