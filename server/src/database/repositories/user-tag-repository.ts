import {
  CreateUserTagInput,
  TagLeaderboardQuery,
  TagUsageStatsQuery,
  UserTagEntity,
  UserTagWithTagQuery,
} from "@/types/database";
import { User, UserTag } from "@/types/api";

import { AssignTagData } from "@/types/service";
import { createLogger } from "@/utils/logger";
import { db } from "../db-client";

const logger = createLogger("user-tag-repository");

export interface TagLeaderboard {
  user_id: string;
  username: string;
  avatar_url?: string;
  tag_count: number;
  primary_tag?: {
    name: string;
    display_name: string;
    color: string;
    icon: string;
  };
}

export class UserTagRepository {
  async create(data: AssignTagData): Promise<UserTagEntity> {
    try {
      const query = `
        INSERT INTO user_tags (user_id, tag_id, assigned_by, is_primary, notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const values = [
        data.user_id,
        data.tag_id,
        data.assigned_by,
        data.is_primary || false,
        data.notes,
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to create user tag", { error, data });
      throw error;
    }
  }

  async findByUser(userId: string): Promise<UserTagWithTagQuery[]> {
    try {
      const query = `
        SELECT 
          ut.*,
          t.name as tag_name,
          t.display_name as tag_display_name,
          t.description as tag_description,
          t.category as tag_category,
          t.color as tag_color,
          t.icon as tag_icon,
          assigned_user.username as assigned_by_username
        FROM user_tags ut
        JOIN tags t ON ut.tag_id = t.id
        LEFT JOIN users assigned_user ON ut.assigned_by = assigned_user.id
        WHERE ut.user_id = $1 AND ut.is_active = true
        ORDER BY ut.is_primary DESC, ut.assigned_at DESC
      `;

      const result = await db.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error("Failed to find user tags", { error, userId });
      throw error;
    }
  }

  async findByUserAndTag(
    userId: string,
    tagId: string,
  ): Promise<UserTagEntity | null> {
    try {
      const query = `
        SELECT ut.*, t.name as tag_name, t.display_name as tag_display_name
        FROM user_tags ut
        JOIN tags t ON ut.tag_id = t.id
        WHERE ut.user_id = $1 AND ut.tag_id = $2
        ORDER BY ut.assigned_at DESC
        LIMIT 1
      `;

      const result = await db.query(query, [userId, tagId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error("Failed to find user tag", { error, userId, tagId });
      throw error;
    }
  }

  async findUsersByTagName(tagName: string): Promise<User[]> {
    try {
      const query = `
        SELECT DISTINCT 
          u.id,
          u.username,
          u.email,
          u.avatar_url,
          u.role,
          u.created_at
        FROM users u
        JOIN user_tags ut ON u.id = ut.user_id
        JOIN tags t ON ut.tag_id = t.id
        WHERE t.name = $1 AND ut.is_active = true
        ORDER BY u.username
      `;

      const result = await db.query(query, [tagName]);
      return result.rows;
    } catch (error) {
      logger.error("Failed to find users by tag name", { error, tagName });
      throw error;
    }
  }

  async removePrimaryTags(userId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE user_tags 
        SET is_primary = false
        WHERE user_id = $1 AND is_primary = true
      `;

      const result = await db.query(query, [userId]);
      return (result.rowCount ?? 0) >= 0;
    } catch (error) {
      logger.error("Failed to remove primary tags", { error, userId });
      throw error;
    }
  }

  async reactivate(userTagId: string): Promise<UserTagEntity> {
    try {
      const query = `
        UPDATE user_tags 
        SET is_active = true, assigned_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await db.query(query, [userTagId]);
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to reactivate user tag", { error, userTagId });
      throw error;
    }
  }

  async deactivate(userId: string, tagId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE user_tags 
        SET is_active = false
        WHERE user_id = $1 AND tag_id = $2
      `;

      const result = await db.query(query, [userId, tagId]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error("Failed to deactivate user tag", { error, userId, tagId });
      throw error;
    }
  }

  async setPrimary(userId: string, tagId: string): Promise<boolean> {
    try {
      // Start transaction
      await db.query("BEGIN");

      // Remove existing primary
      await this.removePrimaryTags(userId);

      // Set new primary
      const query = `
        UPDATE user_tags 
        SET is_primary = true
        WHERE user_id = $1 AND tag_id = $2 AND is_active = true
      `;

      const result = await db.query(query, [userId, tagId]);

      await db.query("COMMIT");
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await db.query("ROLLBACK");
      logger.error("Failed to set primary tag", { error, userId, tagId });
      throw error;
    }
  }

  async getLeaderboard(tagName?: string): Promise<TagLeaderboardQuery[]> {
    try {
      let query = `
        SELECT 
          u.id as user_id,
          u.username,
          u.avatar_url,
          COUNT(ut.id) as tag_count,
          primary_tag.tag_name as primary_tag_name,
          primary_tag.tag_display_name as primary_tag_display_name,
          primary_tag.tag_color as primary_tag_color,
          primary_tag.tag_icon as primary_tag_icon
        FROM users u
        JOIN user_tags ut ON u.id = ut.user_id
        JOIN tags t ON ut.tag_id = t.id
        LEFT JOIN (
          SELECT 
            ut_primary.user_id,
            t_primary.name as tag_name,
            t_primary.display_name as tag_display_name,
            t_primary.color as tag_color,
            t_primary.icon as tag_icon
          FROM user_tags ut_primary
          JOIN tags t_primary ON ut_primary.tag_id = t_primary.id
          WHERE ut_primary.is_primary = true AND ut_primary.is_active = true
        ) primary_tag ON u.id = primary_tag.user_id
        WHERE ut.is_active = true
      `;

      const values: any[] = [];

      if (tagName) {
        query += ` AND t.name = $1`;
        values.push(tagName);
      }

      query += `
        GROUP BY u.id, u.username, u.avatar_url, 
                 primary_tag.tag_name, primary_tag.tag_display_name, 
                 primary_tag.tag_color, primary_tag.tag_icon
        ORDER BY tag_count DESC, u.username
        LIMIT 50
      `;

      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error("Failed to get tag leaderboard", { error, tagName });
      throw error;
    }
  }

  async getUserTagStats(userId: string): Promise<any> {
    try {
      const query = `
        SELECT 
          t.category,
          COUNT(*) as tag_count,
          array_agg(
            json_build_object(
              'name', t.name,
              'display_name', t.display_name,
              'color', t.color,
              'icon', t.icon,
              'assigned_at', ut.assigned_at,
              'is_primary', ut.is_primary
            ) ORDER BY ut.assigned_at DESC
          ) as tags
        FROM user_tags ut
        JOIN tags t ON ut.tag_id = t.id
        WHERE ut.user_id = $1 AND ut.is_active = true
        GROUP BY t.category
        ORDER BY tag_count DESC
      `;

      const result = await db.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error("Failed to get user tag stats", { error, userId });
      throw error;
    }
  }

  async getTagUsageStats(): Promise<TagUsageStatsQuery[]> {
    try {
      const query = `
        SELECT 
          t.name,
          t.display_name,
          t.category,
          t.color,
          t.icon,
          COUNT(ut.id) as usage_count,
          COUNT(CASE WHEN ut.is_primary THEN 1 END) as primary_count,
          MAX(ut.assigned_at) as last_assigned
        FROM tags t
        LEFT JOIN user_tags ut ON t.id = ut.tag_id AND ut.is_active = true
        WHERE t.is_active = true
        GROUP BY t.id, t.name, t.display_name, t.category, t.color, t.icon
        ORDER BY usage_count DESC, t.name
      `;

      const result = await db.query(query);
      return result.rows.map((row) => ({
        ...row,
        usage_count: parseInt(row.usage_count),
        primary_count: parseInt(row.primary_count),
      }));
    } catch (error) {
      logger.error("Failed to get tag usage stats", { error });
      throw error;
    }
  }

  async bulkAssign(
    userIds: string[],
    tagId: string,
    assignedBy?: string,
  ): Promise<UserTagEntity[]> {
    try {
      await db.query("BEGIN");

      const results: UserTagEntity[] = [];

      for (const userId of userIds) {
        try {
          // Check if user already has this tag
          const existing = await this.findByUserAndTag(userId, tagId);
          if (!existing || !existing.is_active) {
            const userTag = await this.create({
              user_id: userId,
              tag_id: tagId,
              assigned_by: assignedBy,
              notes: "Bulk assigned",
            });
            results.push(userTag);
          }
        } catch (error) {
          // Continue with other users if one fails
          logger.warn("Failed to assign tag to user in bulk operation", {
            error,
            userId,
            tagId,
          });
        }
      }

      await db.query("COMMIT");
      return results;
    } catch (error) {
      await db.query("ROLLBACK");
      logger.error("Failed to bulk assign tags", { error, userIds, tagId });
      throw error;
    }
  }

  async searchUserTags(searchTerm: string, limit: number = 50): Promise<any[]> {
    try {
      const query = `
        SELECT DISTINCT
          u.id as user_id,
          u.username,
          u.avatar_url,
          t.name as tag_name,
          t.display_name as tag_display_name,
          t.color as tag_color,
          t.icon as tag_icon,
          ut.assigned_at,
          ut.is_primary
        FROM users u
        JOIN user_tags ut ON u.id = ut.user_id
        JOIN tags t ON ut.tag_id = t.id
        WHERE (
          u.username ILIKE $1 OR 
          t.name ILIKE $1 OR 
          t.display_name ILIKE $1
        ) AND ut.is_active = true
        ORDER BY ut.is_primary DESC, ut.assigned_at DESC
        LIMIT $2
      `;

      const searchPattern = `%${searchTerm}%`;
      const result = await db.query(query, [searchPattern, limit]);
      return result.rows;
    } catch (error) {
      logger.error("Failed to search user tags", { error, searchTerm });
      throw error;
    }
  }
}

export const userTagRepository = new UserTagRepository();
