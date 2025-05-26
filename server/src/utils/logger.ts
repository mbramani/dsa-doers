import colors from "colors/safe.js";
import fs from "fs";
import morgan from "morgan";
import path from "path";
import winston from "winston";

export function createLogger(serviceName: string) {
  const logDir = path.resolve("logs");

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const customLevels = {
    levels: {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      debug: 4,
      silly: 5,
    },
    colors: {
      error: "red bold",
      warn: "yellow bold",
      info: "green bold",
      http: "magenta",
      debug: "blue",
      silly: "grey",
    },
  };

  winston.addColors(customLevels.colors);

  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    levels: customLevels.levels,
    format: winston.format.combine(
      winston.format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss",
      }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    ),
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.printf(
            ({ timestamp, level, message, service, ...meta }) => {
              const time = colors.cyan(`[${timestamp}]`);
              const lvl = level;
              const svc = colors.blue(`[${service}]`);
              const msg = colors.white(String(message));

              let metaStr = "";
              if (Object.keys(meta).length > 0 && meta.stack === undefined) {
                const metaObj = { ...meta };
                delete metaObj.service;
                delete metaObj.timestamp;

                metaStr = colors.gray(JSON.stringify(metaObj));
              }

              let stackStr = "";
              if (meta.stack) {
                stackStr = "\n" + colors.red(String(meta.stack));
              }

              return `${time} ${lvl} ${svc}: ${msg} ${metaStr}${stackStr}`.trim();
            },
          ),
        ),
      }),
      new winston.transports.File({
        filename: path.join(logDir, `${serviceName}-error.log`),
        level: "error",
        handleExceptions: true,
        handleRejections: true,
      }),
      new winston.transports.File({
        filename: path.join(logDir, `${serviceName}-combined.log`),
        handleRejections: false,
      }),
    ],
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join(logDir, `${serviceName}-exceptions.log`),
      }),
    ],
    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join(logDir, `${serviceName}-rejections.log`),
      }),
    ],
    exitOnError: false,
  });

  return logger;
}

export function createMorganMiddleware(logger: winston.Logger) {
  morgan.token("status-colored", (req, res) => {
    const status = res.statusCode;
    let color = "green";

    if (status >= 500) color = "red";
    else if (status >= 400) color = "yellow";
    else if (status >= 300) color = "cyan";

    const colorFn = (colors as any)[color];
    return colorFn ? colorFn(status.toString()) : status.toString();
  });

  morgan.token("method-colored", (req) => {
    const method = req.method;
    let color = "white";

    if (method === "GET") color = "green";
    else if (method === "POST") color = "yellow";
    else if (method === "PUT" || method === "PATCH") color = "blue";
    else if (method === "DELETE") color = "red";

    const colorFn = (colors as any)[color];
    return colorFn ? colorFn(method) : method;
  });

  const morganStream = {
    write: (message: string) => {
      const trimmed = message.trim();
      const parts = trimmed.split(" ");

      if (parts.length < 3) {
        logger.info(trimmed);
        return;
      }

      const status = parts[2] ? parseInt(parts[2], 10) : 0;

      if (status >= 500) {
        logger.error(trimmed);
      } else if (status >= 400) {
        logger.warn(trimmed);
      } else {
        logger.info(trimmed);
      }
    },
  };

  return morgan(
    ":method-colored :url :status-colored :res[content-length] - " +
      colors.magenta(":response-time ms") +
      " " +
      colors.gray(":remote-addr"),
    {
      stream: morganStream,
    },
  );
}

export type Logger = ReturnType<typeof createLogger>;
