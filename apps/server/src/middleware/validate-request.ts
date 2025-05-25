import { NextFunction, Request, Response } from "express";

import { BadRequestError } from "@/utils/errors";
import { z } from "zod";

export function validateRequest(schema: {
  body?: z.ZodType<any, any>;
  query?: z.ZodType<any, any>;
  params?: z.ZodType<any, any>;
}) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (
      schema.query &&
      req.query.filter &&
      typeof req.query.filter === "string"
    ) {
      try {
        req.query.filter = JSON.parse(req.query.filter);
      } catch (error) {
        throw new BadRequestError("Invalid request query", {
          filter: `Invalid filter format. Must be valid JSON. ${error instanceof Error ? error.message : ""}`,
        });
      }
    }

    (["body", "query", "params"] as const).forEach((key) => {
      if (!schema[key]) return;

      const result = schema[key]!.safeParse(req[key]);

      if (!result.success) {
        throw new BadRequestError(`Invalid request ${key}`, result.error);
      }

      req[key] = result.data;
    });

    next();
  };
}
