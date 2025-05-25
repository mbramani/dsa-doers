import { NextFunction, Request, Response } from "express";

import { AppError } from "@/utils/errors";
import { Logger } from "@workspace/utils/logger";
import config from "@/utils/config";

interface ErrorHandlerOptions {
  logger: Logger;
  isProduction?: boolean;
}

interface ErrorResponse {
  status: "error";
  message: string;
  errors?: Record<string, any>;
  stack?: string;
}

interface ErrorDetails {
  errors?: Record<string, any>;
}

export function errorHandler({
  logger,
  isProduction = config.isProduction,
}: ErrorHandlerOptions) {
  return (err: Error, req: Request, res: Response, _next: NextFunction) => {
    let statusCode = 500;
    let message = "Internal Server Error";
    let errorDetails: ErrorDetails = {};

    if (err instanceof AppError) {
      statusCode = err.statusCode;
      message = err.message;

      if ("errors" in err) {
        errorDetails.errors = (err as any).errors;
      }

      if (err.isOperational && statusCode < 500) {
        logger.warn(`${statusCode} - ${message}`, {
          path: req.path,
          method: req.method,
          ip: req.ip,
          ...errorDetails,
        });
      } else {
        logger.error(`${statusCode} - ${message}`, {
          error: err,
          path: req.path,
          method: req.method,
          ip: req.ip,
        });
      }
    } else if (err.name === "SyntaxError" && (err as any).status === 400) {
      statusCode = 400;
      message = "Invalid JSON payload";

      logger.warn(`${statusCode} - ${message}`, {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
    } else {
      logger.error(`Unhandled error: ${err.message}`, {
        error: err,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
    }

    const errorResponse: ErrorResponse = {
      status: "error",
      message,
      ...(errorDetails.errors && { errors: errorDetails.errors }),
      ...(!isProduction && { stack: err.stack }),
    };

    res.status(statusCode).json(errorResponse);
  };
}