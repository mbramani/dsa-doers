import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().transform(Number).default("3001"),
  HOST: z.string().default("localhost"),

  // Database configuration
  DATABASE_HOST: z.string(),
  DATABASE_PORT: z.string().transform(Number),
  DATABASE_NAME: z.string(),
  DATABASE_USER: z.string(),
  DATABASE_PASSWORD: z.string(),
  DATABASE_SSL: z
    .string()
    .transform((val) => val === "true")
    .default("true"),
  DATABASE_URL: z.string().optional(),

  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default("7d"),

  DISCORD_CLIENT_ID: z.string(),
  DISCORD_CLIENT_SECRET: z.string(),
  DISCORD_BOT_TOKEN: z.string(),
  DISCORD_GUILD_ID: z.string(),
  DISCORD_REDIRECT_URI: z.string(),
  DISCORD_INVITE_URL: z.string().optional(),

  CLIENT_URL: z.string().default("http://localhost:3000"),
});

let env;
try {
  env = envSchema.parse(process.env);
} catch (error: any) {
  console.error("Environment variable validation failed:", error?.errors);
  process.exit(1);
}
export default {
  env: {
    server: {
      environment: env.NODE_ENV,
      port: env.PORT,
      host: env.HOST,
    },
    db: {
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT,
      database: env.DATABASE_NAME,
      user: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      ssl: env.DATABASE_SSL
        ? {
            rejectUnauthorized: false, // This allows self-signed certificates
          }
        : false,
      poolSize: 10,
    },
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
    },
    discord: {
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      botToken: env.DISCORD_BOT_TOKEN,
      guildId: env.DISCORD_GUILD_ID,
      redirectUri: env.DISCORD_REDIRECT_URI,
      inviteUrl: env.DISCORD_INVITE_URL,
    },
    frontend: {
      url: env.CLIENT_URL,
    },
  },
};
