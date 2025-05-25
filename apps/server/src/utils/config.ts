import { createLogger } from "@workspace/utils/logger";
import dotenv from "dotenv";

dotenv.config();

const logger = createLogger("server");

class Config {
  private static instance: Config;

  public readonly env = {
    server: {
      port: parseInt(process.env.PORT || "3001"),
      host: process.env.HOST || "localhost",
      environment: process.env.NODE_ENV || "development",
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
      redirectUri:
        process.env.DISCORD_REDIRECT_URI ||
        "http://localhost:3001/api/auth/discord/callback",
      guildId: process.env.DISCORD_GUILD_ID || "",
      botToken: process.env.DISCORD_BOT_TOKEN || "",
      inviteUrl: process.env.DISCORD_INVITE_URL || "",
    },
    jwt: {
      secret: process.env.JWT_SECRET || "your-jwt-secret",
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  };

  private constructor() {
    this.validateConfig();
  }

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  private validateConfig() {
    const requiredFields = [
      "DISCORD_CLIENT_ID",
      "DISCORD_CLIENT_SECRET",
      "DISCORD_GUILD_ID",
      "DISCORD_BOT_TOKEN",
      "JWT_SECRET",
    ];

    const missingFields = requiredFields.filter((field) => !process.env[field]);

    if (missingFields.length > 0) {
      logger.error("Missing required environment variables", { missingFields });
      throw new Error(
        `Missing required environment variables: ${missingFields.join(", ")}`,
      );
    }
  }
}

export default Config.getInstance();
