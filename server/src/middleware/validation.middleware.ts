import { NextFunction, Request, Response } from "express";

import { z } from "zod";

interface ApiResponse<T = any> {
  status: "success" | "error";
  data?: T;
  message: string;
  errors?: Record<string, string>;
}

const discordCallbackSchema = z.object({
  query: z.object({
    code: z.string().min(1, "Authorization code is required"),
    state: z.string().optional(),
  }),
});

export const validateDiscordCallback = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    discordCallbackSchema.parse(req);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join(".");
        errors[path] = err.message;
      });

      const response: ApiResponse = {
        status: "error",
        message: "Invalid callback parameters",
        errors,
      };

      res.status(400).json(response);
    } else {
      const response: ApiResponse = {
        status: "error",
        message: "Validation failed",
        errors: {
          validation: "Invalid request parameters",
        },
      };

      res.status(400).json(response);
    }
  }
};
