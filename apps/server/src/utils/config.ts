import { createLogger } from "@workspace/utils/logger";
import dotenv from "dotenv";

dotenv.config();

const logger = createLogger("server");

class Config {
  public readonly env = {
    frontend: {
      url:
        process.env.FRONTEND_URL ||
        this.logMissingEnv("FRONTEND_URL", "http://localhost:3000"),
    },
    db: {
      host: process.env.DB_HOST || this.logMissingEnv("DB_HOST", "localhost"),
      port: process.env.DB_PORT || this.logMissingEnv("DB_PORT", "5432"),
      name: process.env.DB_NAME || this.logMissingEnv("DB_NAME", "database"),
      user: process.env.DB_USER || this.logMissingEnv("DB_USER", "user"),
      password:
        process.env.DB_PASSWORD ||
        this.logMissingEnv("DB_PASSWORD", "password"),
      ssl: process.env.DB_SSL || this.logMissingEnv("DB_SSL", "false"),
      poolSize:
        process.env.DB_POOL_SIZE || this.logMissingEnv("DB_POOL_SIZE", "10"),
    },
    server: {
      port: process.env.PORT || this.logMissingEnv("PORT", "5000"),
      host: process.env.HOST || this.logMissingEnv("HOST", "localhost"),
    },
  };

  public readonly isProduction: boolean = process.env.NODE_ENV === "production";

  private static instance: Config;

  private constructor() {}

  private logMissingEnv(envVar: string, defaultValue: string): string {
    logger.warn(
      `Environment variable ${envVar} is missing. Using default value: ${defaultValue}`,
    );
    return defaultValue;
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }
}

export default Config.getInstance();