import {
  CreateUserInput,
  UserEntity,
  UserWithTagsQuery,
} from "@/types/database";
import { PaginatedResponse, User, UserRole } from "@/types/api";

import { CreateUserData } from "@/types/service";
import { createLogger } from "@/utils/logger";
import { db } from "../db-client";

const logger = createLogger("user-repository");

export class UserRepository {
  async create(userData: CreateUserData): Promise<UserEntity> {
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

  async findById(id: string): Promise<UserEntity | null> {
    try {
      const query = "SELECT * FROM users WHERE id = $1";
      const result = await db.query(query, [id]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error("Failed to find user by id", { error, id });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    try {
      const query = "SELECT * FROM users WHERE email = $1";
      const result = await db.query(query, [email]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error("Failed to find user by email", { error, email });
      throw error;
    }
  }

  async updateRole(id: string, role: UserRole): Promise<UserEntity> {
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

  async findWithDiscordProfile(
    userId: string,
  ): Promise<UserWithTagsQuery | null> {
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
      const row = result.rows[0];

      if (!row) return null;

      return {
        id: row.id,
        email: row.email,
        username: row.username,
        avatar_url: row.avatar_url,
        role: row.role,
        created_at: row.created_at,
        updated_at: row.updated_at,
        discordProfile: row.discord_profile_id
          ? {
              id: row.discord_profile_id,
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

  async findAllWithDiscordProfiles(
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<UserWithTagsQuery[]> {
    try {
      const offset = (page - 1) * limit;
      let whereClause = "";
      const params: any[] = [limit, offset];

      if (search) {
        whereClause = "WHERE u.username ILIKE $3 OR u.email ILIKE $3";
        params.push(`%${search}%`);
      }

      const query = `
        SELECT 
          u.*,
          dp.id as discord_profile_id,
          dp.discord_id,
          dp.discord_username,
          dp.discord_avatar,
          dp.guild_joined,
          dp.created_at as discord_created_at,
          -- Get user's tags
          COALESCE(
            json_agg(
              CASE WHEN ut.id IS NOT NULL THEN
                json_build_object(
                  'id', ut.id,
                  'is_primary', ut.is_primary,
                  'assigned_at', ut.assigned_at,
                  'tag', json_build_object(
                    'id', t.id,
                    'name', t.name,
                    'display_name', t.display_name,
                    'color', t.color,
                    'icon', t.icon,
                    'category', t.category
                  )
                )
              END
            ) FILTER (WHERE ut.id IS NOT NULL),
            '[]'::json
          ) as tags
        FROM users u
        LEFT JOIN discord_profiles dp ON u.id = dp.user_id
        LEFT JOIN user_tags ut ON u.id = ut.user_id AND ut.is_active = true
        LEFT JOIN tags t ON ut.tag_id = t.id
        ${whereClause}
        GROUP BY u.id, dp.id, dp.discord_id, dp.discord_username, dp.discord_avatar, dp.guild_joined, dp.created_at
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const result = await db.query(query, params);
      return result.rows.map((row) => ({
        ...row,
        tags: row.tags || [],
      }));
    } catch (error) {
      logger.error("Failed to find users with discord profiles", { error });
      throw error;
    }
  }

  async getTotalCount(search?: string): Promise<number> {
    try {
      let whereClause = "";
      const params: any[] = [];

      if (search) {
        whereClause = "WHERE username ILIKE $1 OR email ILIKE $1";
        params.push(`%${search}%`);
      }

      const query = `SELECT COUNT(*) as count FROM users ${whereClause}`;
      const result = await db.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error("Failed to get total user count", { error });
      throw error;
    }
  }

  async softDelete(userId: string): Promise<boolean> {
    try {
      // For now, we'll just update a flag or role
      // In production, add a deleted_at timestamp column
      const query = `
        UPDATE users 
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      const result = await db.query(query, [userId]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error("Failed to soft delete user", { error, userId });
      throw error;
    }
  }

  async getDashboardStats() {
    try {
      const queries = await Promise.all([
        // Total users
        db.query("SELECT COUNT(*) as total_users FROM users"),

        // Users by role
        db.query(`
          SELECT role, COUNT(*) as count 
          FROM users 
          GROUP BY role 
          ORDER BY role
        `),

        // Discord connected users
        db.query(`
          SELECT 
            COUNT(*) as total_discord_users,
            COUNT(CASE WHEN guild_joined = true THEN 1 END) as guild_members
          FROM discord_profiles
        `),

        // Recent signups (last 30 days)
        db.query(`
          SELECT COUNT(*) as recent_signups 
          FROM users 
          WHERE created_at >= NOW() - INTERVAL '30 days'
        `),

        // Tag statistics
        db.query(`
          SELECT 
            COUNT(DISTINCT t.id) as total_tags,
            COUNT(DISTINCT ut.user_id) as users_with_tags,
            COUNT(ut.id) as total_assignments
          FROM tags t
          LEFT JOIN user_tags ut ON t.id = ut.tag_id AND ut.is_active = true
        `),
      ]);

      return {
        totalUsers: parseInt(queries[0].rows[0].total_users),
        usersByRole: queries[1].rows,
        discordStats: queries[2].rows[0],
        recentSignups: parseInt(queries[3].rows[0].recent_signups),
        tagStats: queries[4].rows[0],
      };
    } catch (error) {
      logger.error("Failed to get dashboard stats", { error });
      throw error;
    }
  }
}

export const userRepository = new UserRepository();
