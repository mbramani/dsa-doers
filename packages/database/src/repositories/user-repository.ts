import { UserRole } from "@workspace/types/api";
import { createLogger } from "@workspace/utils/logger";
import { db } from "../utils/db-client";

const logger = createLogger("user-repository");

export interface User {
  id: string;
  email?: string;
  username: string;
  avatar_url?: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email?: string;
  username: string;
  avatar_url?: string;
  role?: UserRole;
}

export class UserRepository {
  async create(userData: CreateUserData): Promise<User> {
    try {
      const query = `
        INSERT INTO users (email, username, avatar_url, role)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const result = await db.query(query, [
        userData.email,
        userData.username,
        userData.avatar_url,
        userData.role || UserRole.NEWBIE,
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error("Failed to create user", { error, userData });
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const query = "SELECT * FROM users WHERE id = $1";
      const result = await db.query(query, [id]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error("Failed to find user by id", { error, id });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const query = "SELECT * FROM users WHERE email = $1";
      const result = await db.query(query, [email]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error("Failed to find user by email", { error, email });
      throw error;
    }
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    try {
      const query = `
        UPDATE users 
        SET role = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      const result = await db.query(query, [role, id]);

      return result.rows[0];
    } catch (error) {
      logger.error("Failed to update user role", { error, id, role });
      throw error;
    }
  }

  async findWithDiscordProfile(userId: string) {
    try {
      const query = `
        SELECT 
          u.*,
          dp.id as discord_profile_id,
          dp.discord_id,
          dp.discord_username,
          dp.discord_avatar,
          dp.guild_joined,
          dp.created_at as discord_created_at
        FROM users u
        LEFT JOIN discord_profiles dp ON u.id = dp.user_id
        WHERE u.id = $1
      `;

      const result = await db.query(query, [userId]);

      if (!result.rows[0]) return null;

      const row = result.rows[0];

      return {
        ...row,
        discordProfile: row.discord_profile_id
          ? {
              id: row.discord_profile_id,
              user_id: row.id,
              discord_id: row.discord_id,
              discord_username: row.discord_username,
              discord_avatar: row.discord_avatar,
              guild_joined: row.guild_joined,
              created_at: row.discord_created_at,
            }
          : null,
      };
    } catch (error) {
      logger.error("Failed to find user with discord profile", {
        error,
        userId,
      });
      throw error;
    }
  }
}

export const userRepository = new UserRepository();
