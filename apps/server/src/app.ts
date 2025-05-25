import "express-async-errors";

import { createLogger, createMorganMiddleware } from "@workspace/utils/logger";

import { appRoutes } from "@/routes";
import config from "@/utils/config";
import cors from "cors";
import dotenv from "dotenv";
import { errorHandler } from "@/middleware/error-handler";
import express from "express";
import { notFoundHandler } from "@/middleware/not-found";

dotenv.config();

const app = express();
const port = config.env.server.port;

// Create logger instance
const logger = createLogger("server");
const morganMiddleware = createMorganMiddleware(logger);

// Middleware
const checkCorsOrigin = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => {
  if (!origin) return callback(null, true);

  const hostname = new URL(origin).hostname;

  if (hostname === config.env.server.host) return callback(null, true);

  return callback(new Error("Not allowed by CORS"));
};

app.use(
  cors({
    origin: checkCorsOrigin,
    credentials: true,
  }),
);
app.use(express.json());
app.use(morganMiddleware);

// Routes
app.use("/api", appRoutes);

// Not found handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler({ logger }));

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});