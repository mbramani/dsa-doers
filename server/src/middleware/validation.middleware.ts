import { AnyZodObject, ZodError } from "zod";
import { NextFunction, Request, Response } from "express";

import { ApiResponse } from "../types/api";

export const validateRequest = (schema: AnyZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // if validation passes, update the request object with parsed data
      req.body = parsed.body;
      Object.assign(req.query, parsed.query);
      Object.assign(req.params, parsed.params);

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.slice(1).join("."); // Remove 'body', 'query', or 'params' prefix
          errors[path || "root"] = err.message;
        });

        const response: ApiResponse = {
          status: "error",
          message: "Validation failed",
          errors,
        };

        res.status(400).json(response);
      } else {
        const response: ApiResponse = {
          status: "error",
          message: "Validation failed",
          errors: {
            validation: "Invalid request format",
          },
        };

        res.status(400).json(response);
      }
    }
  };
};
