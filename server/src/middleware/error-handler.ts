import { NextFunction, Request, Response } from "express";

import { ApiResponse } from "@/types/api";
import { AppError } from "@/utils/errors";
import { createLogger } from "@/utils/logger";

const logger = createLogger("error-handler");

export function errorHandler() {
  return (err: Error, req: Request, res: Response, _next: NextFunction) => {
    let statusCode = 500;
    let message = "Internal Server Error";
    let errors: Record<string, string> | undefined;

    if (err instanceof AppError) {
      statusCode = err.statusCode;
      message = err.message;

      if ("errors" in err) {
        errors = (err as any).errors;
      }

      if (err.isOperational && statusCode < 500) {
        logger.warn(`${statusCode} - ${message}`, {
          path: req.path,
          method: req.method,
          ip: req.ip,
        });
      } else {
        logger.error(`${statusCode} - ${message}`, {
          error: err.message,
          path: req.path,
          method: req.method,
        });
      }
    } else {
      logger.error(`Unhandled error: ${err.message}`, {
        error: err.message,
        path: req.path,
        method: req.method,
      });
    }

    const response: ApiResponse = {
      status: "error",
      message,
      ...(errors && { errors }),
    };

    res.status(statusCode).json(response);
  };
}
