import dotenv from 'dotenv';
import { envSchema, type EnvConfig } from '../schemas/env';

// Load environment variables
dotenv.config();

const validateEnv = (): EnvConfig => {
  try {
    const config = envSchema.parse(process.env);
    console.log('✅ Environment variables validated successfully');
    return config;
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    process.exit(1);
  }
};

export const config = validateEnv();

export const serverConfig = {
  port: config.PORT,
  nodeEnv: config.NODE_ENV,
  logLevel: config.LOG_LEVEL,
  corsOrigin: config.CORS_ORIGIN,
} as const;

export const databaseConfig = {
  url: config.DATABASE_URL,
} as const;

export const discordConfig = {
  token: config.DISCORD_TOKEN,
  clientId: config.DISCORD_CLIENT_ID,
  clientSecret: config.DISCORD_CLIENT_SECRET,
  guildId: config.DISCORD_GUILD_ID,
  redirectUri: config.DISCORD_REDIRECT_URI,
} as const;

export const jwtConfig = {
  secret: config.JWT_SECRET,
  expiresIn: config.JWT_EXPIRES_IN,
} as const;

export const rateLimitConfig = {
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  maxRequests: config.RATE_LIMIT_MAX_REQUESTS,
} as const;
