import fs from "fs";
import morgan from "morgan";
import path from "path";
import { serverConfig } from "./config";
import winston from "winston";

// Types for better type safety
interface LogContext {
  [key: string]: any;
}

interface CustomLoggerMeta extends LogContext {
  service: string;
  environment: string;
  timestamp?: string;
}

// Constants
const SERVICE_NAME = "dsa-doers";
const LOG_FILE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_LOG_FILES = 5;
const TIMESTAMP_FORMAT = "YYYY-MM-DD HH:mm:ss";

// Environment variables with defaults
const LOG_LEVEL = serverConfig.logLevel;
const NODE_ENV = serverConfig.nodeEnv;
const IS_PRODUCTION = NODE_ENV === "production";

// Ensure logs directory exists
const createLogsDirectory = (): string => {
  const logsDir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
};

const logsDir = createLogsDirectory();

// Winston logger configuration with better error handling
const createLogger = (): winston.Logger => {
  const loggerConfig: winston.LoggerOptions = {
    level: LOG_LEVEL,
    format: winston.format.combine(
      winston.format.timestamp({ format: TIMESTAMP_FORMAT }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    ),
    defaultMeta: {
      service: SERVICE_NAME,
      environment: NODE_ENV,
    } as CustomLoggerMeta,
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: TIMESTAMP_FORMAT }),
          winston.format.printf(
            ({ timestamp, level, message, service, environment, ...meta }) => {
              const metaString =
                Object.keys(meta).length > 0
                  ? `\n${JSON.stringify(meta, null, 2)}`
                  : "";
              return `${timestamp} [${service}:${environment}] ${level}: ${message}${metaString}`;
            },
          ),
        ),
      }),
      new winston.transports.File({
        filename: path.join(logsDir, "error.log"),
        level: "error",
        maxsize: LOG_FILE_MAX_SIZE,
        maxFiles: MAX_LOG_FILES,
        handleExceptions: false,
        handleRejections: false,
      }),
      new winston.transports.File({
        filename: path.join(logsDir, "combined.log"),
        maxsize: LOG_FILE_MAX_SIZE,
        maxFiles: MAX_LOG_FILES,
        handleExceptions: false,
        handleRejections: false,
      }),
    ],
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join(logsDir, "exceptions.log"),
        maxsize: LOG_FILE_MAX_SIZE,
        maxFiles: MAX_LOG_FILES,
      }),
    ],
    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join(logsDir, "rejections.log"),
        maxsize: LOG_FILE_MAX_SIZE,
        maxFiles: MAX_LOG_FILES,
      }),
    ],
    exitOnError: false,
  };

  return winston.createLogger(loggerConfig);
};

export const logger = createLogger();


// Morgan HTTP logger middleware with better configuration
const createMorganFormat = (): string => {
  return IS_PRODUCTION
    ? "combined"
    : ":method :url :status :res[content-length] - :response-time ms [:date[iso]]";
};

export const httpLogger = morgan(createMorganFormat(), {
  stream: {
    write: (message: string): void => {
      logger.info(message.trim());
    },
  },
  skip: (req): boolean => {
    // Skip logging for health checks and static assets in production
    if (IS_PRODUCTION) {
      const skipPaths = ["/health", "/favicon.ico", "/robots.txt"];
      return skipPaths.includes(req.url || "");
    }
    return false;
  },
});

// Enhanced helper functions with better type safety
export const logError = (error: Error | string, context?: LogContext): void => {
  const message = error instanceof Error ? error.message : error;
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error(message, {
    ...(stack && { stack }),
    ...(context && { context }),
    timestamp: new Date().toISOString(),
  });
};

export const logInfo = (message: string, meta?: LogContext): void => {
  logger.info(message, meta);
};

export const logWarn = (message: string, meta?: LogContext): void => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: LogContext): void => {
  logger.debug(message, meta);
};

// Structured logging helpers
export const logHttpRequest = (req: any, meta?: LogContext): void => {
  logger.info("HTTP Request", {
    method: req.method,
    url: req.url,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    ...meta,
  });
};

export const logPerformance = (
  operation: string,
  duration: number,
  meta?: LogContext,
): void => {
  logger.info("Performance Metric", {
    operation,
    duration,
    unit: "ms",
    ...meta,
  });
};

// Graceful shutdown handler
export const closeLogger = (): Promise<void> => {
  return new Promise((resolve) => {
    logger.on("finish", resolve);
    logger.end();
  });
};
