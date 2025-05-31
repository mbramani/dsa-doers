import app from "./app";
import { db } from "./services/database.service";
import { logger } from "./utils/logger";
import { serverConfig } from "./utils/config";

const startServer = async () => {
  try {
    logger.info("🔄 Starting server initialization...");

    // Connect to database
    logger.info("📊 Connecting to database...");
    await db.connect();
    logger.info("✅ Database connected successfully");

    // Start server
    logger.info(`🚀 Starting HTTP server on port ${serverConfig.port}...`);
    const server = app.listen(serverConfig.port, () => {
      logger.info(
        `✅ Server running successfully on port ${serverConfig.port}`,
      );
      logger.info(`🌐 Server URL: http://localhost:${serverConfig.port}`);
    });

    // Handle server errors
    server.on("error", (error) => {
      logger.error("❌ Server error:", error);
    });
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  try {
    await db.disconnect();
    logger.info("✅ Database disconnected");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer();
