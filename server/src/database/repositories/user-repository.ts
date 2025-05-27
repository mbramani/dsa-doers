import { CreateUserData, User, UserRole } from "@/types/api";

import { createLogger } from "@/utils/logger";
import { db } from "../db-client";

const logger = createLogger("user-repository");

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

  async findAllWithDiscordProfiles(page: number = 1, limit: number = 20, search?: string) {
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
          dp.created_at as discord_created_at
        FROM users u
        LEFT JOIN discord_profiles dp ON u.id = dp.user_id
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const result = await db.query(query, params);

      return result.rows.map(row => ({
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
      }));
    } catch (error) {
      logger.error("Failed to find all users with discord profiles", { error });
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

      const query = `SELECT COUNT(*) FROM users ${whereClause}`;
      const result = await db.query(query, params);
      
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error("Failed to get user count", { error });
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
      ]);

      return {
        totalUsers: parseInt(queries[0].rows[0].total_users),
        usersByRole: queries[1].rows,
        discordStats: queries[2].rows[0],
        recentSignups: parseInt(queries[3].rows[0].recent_signups),
      };
    } catch (error) {
      logger.error("Failed to get dashboard stats", { error });
      throw error;
    }
  }
}

export const userRepository = new UserRepository();
