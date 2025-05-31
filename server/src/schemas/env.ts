import { z } from "zod";

const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(65535))
    .default("3000"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

  // Database Configuration
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  // Discord Configuration
  DISCORD_BOT_TOKEN: z.string().min(1, "DISCORD_BOT_TOKEN is required"),
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),
  DISCORD_CLIENT_SECRET: z.string().min(1, "DISCORD_CLIENT_SECRET is required"),
  DISCORD_GUILD_ID: z.string().min(1, "DISCORD_GUILD_ID is required"),
  DISCORD_REDIRECT_URI: z
    .string()
    .url("DISCORD_REDIRECT_URI must be a valid URL"),

  // JWT Configuration
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long"),
  JWT_EXPIRES_IN: z.string().default("30d"),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .transform(Number)
    .pipe(z.number().positive())
    .default("900000"),
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .transform(Number)
    .pipe(z.number().positive())
    .default("100"),

  // CORS Configuration
  CORS_ORIGIN: z
    .string()
    .url("CORS_ORIGIN must be a valid URL")
    .default("http://localhost:5173"),
    
    FRONTEND_URL: z
    .string()
    .url("FRONTEND_URL must be a valid URL")
    .default("http://localhost:5173"),
});

export type EnvConfig = z.infer<typeof envSchema>;
export { envSchema };
