import { CreateTagData, UpdateTagData } from "@/types/service";
import {
  CreateTagInput,
  TagEntity,
  TagUsageStatsQuery,
} from "@/types/database";

import { Tag } from "@/types/api";
import { createLogger } from "@/utils/logger";
import { db } from "../db-client";

const logger = createLogger("tag-repository");

export class TagRepository {
  async create(data: CreateTagData): Promise<TagEntity> {
    try {
      const query = `
        INSERT INTO tags (name, display_name, description, category, color, icon, is_assignable, is_earnable)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        data.name,
        data.display_name,
        data.description,
        data.category,
        data.color,
        data.icon,
        data.is_assignable,
        data.is_earnable,
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to create tag", { error, data });
      throw error;
    }
  }

  async findAll(): Promise<TagEntity[]> {
    try {
      const query = `
        SELECT * FROM tags 
        WHERE is_active = true 
        ORDER BY category, name
      `;

      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error("Failed to find all tags", { error });
      throw error;
    }
  }

  async findById(id: string): Promise<TagEntity | null> {
    try {
      const query = `SELECT * FROM tags WHERE id = $1 AND is_active = true`;
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error("Failed to find tag by id", { error, id });
      throw error;
    }
  }

  async findByName(name: string): Promise<TagEntity | null> {
    try {
      const query = `SELECT * FROM tags WHERE name = $1`;
      const result = await db.query(query, [name]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error("Failed to find tag by name", { error, name });
      throw error;
    }
  }

  async findAssignable(): Promise<TagEntity[]> {
    try {
      const query = `
        SELECT * FROM tags 
        WHERE is_assignable = true AND is_active = true
        ORDER BY category, name
      `;

      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error("Failed to find assignable tags", { error });
      throw error;
    }
  }

  async findByCategory(category: string): Promise<TagEntity[]> {
    try {
      const query = `
        SELECT * FROM tags 
        WHERE category = $1 AND is_active = true 
        ORDER BY name
      `;

      const result = await db.query(query, [category]);
      return result.rows;
    } catch (error) {
      logger.error("Failed to find tags by category", { error, category });
      throw error;
    }
  }

  async update(id: string, data: UpdateTagData): Promise<TagEntity | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error("No fields to update");
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE tags 
        SET ${fields.join(", ")}
        WHERE id = $${paramCount} AND is_active = true
        RETURNING *
      `;

      const result = await db.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      logger.error("Failed to update tag", { error, id, data });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const query = `
        UPDATE tags 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      const result = await db.query(query, [id]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error("Failed to delete tag", { error, id });
      throw error;
    }
  }

  async getTagStats(): Promise<TagUsageStatsQuery[]> {
    try {
      const query = `
        SELECT 
          t.category,
          COUNT(*) as total_tags,
          COUNT(CASE WHEN t.is_assignable THEN 1 END) as assignable_tags,
          COUNT(CASE WHEN t.is_earnable THEN 1 END) as earnable_tags
        FROM tags t
        WHERE t.is_active = true
        GROUP BY t.category
        ORDER BY t.category
      `;

      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error("Failed to get tag stats", { error });
      throw error;
    }
  }

  async searchTags(
    searchTerm: string,
    limit: number = 50,
  ): Promise<TagEntity[]> {
    try {
      const query = `
        SELECT * FROM tags
        WHERE (
          name ILIKE $1 OR 
          display_name ILIKE $1 OR 
          description ILIKE $1
        ) AND is_active = true
        ORDER BY 
          CASE WHEN name ILIKE $1 THEN 1 ELSE 2 END,
          name
        LIMIT $2
      `;

      const searchPattern = `%${searchTerm}%`;
      const result = await db.query(query, [searchPattern, limit]);
      return result.rows;
    } catch (error) {
      logger.error("Failed to search tags", { error, searchTerm });
      throw error;
    }
  }
}

export const tagRepository = new TagRepository();
