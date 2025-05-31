import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { httpLogger, logger } from "./utils/logger";

import { authRoutes } from "./routes/auth.routes";
import cookieParser from "cookie-parser";
import cors from "cors";
import { db } from "./services/database.service";
import express from "express";
import helmet from "helmet";
import { roleRoutes } from "./routes/role.routes";
import { serverConfig } from "./utils/config";

interface ApiResponse<T = any> {
  status: "success" | "error";
  data?: T;
  message: string;
  errors?: Record<string, string>;
}

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: serverConfig.corsOrigin,
    credentials: true,
  }),
);
app.use(cookieParser()); // For parsing HTTP-only cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/roles", roleRoutes);

// Health check
app.get("/health", async (req, res) => {
  try {
    const dbHealthy = await db.healthCheck();

    const response: ApiResponse = {
      status: "success",
      message: "Server is healthy",
      data: {
        server: "running",
        database: dbHealthy ? "connected" : "disconnected",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      status: "error",
      message: "Health check failed",
      errors: {
        health:
          error instanceof Error ? error.message : "Unknown health check error",
      },
    };

    res.status(503).json(response);
  }
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
