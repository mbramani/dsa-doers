import {
  CreateDiscordProfileInput,
  DiscordProfileEntity,
} from "@/types/database";

import { CreateDiscordProfileData } from "@/types/service";
import { DiscordProfile } from "@/types/api";
import { createLogger } from "@/utils/logger";
import { db } from "../db-client";

const logger = createLogger("discord-profile-repository");

export class DiscordProfileRepository {
  async create(
    profileData: CreateDiscordProfileData,
  ): Promise<DiscordProfileEntity> {
    try {
      const query = `
        INSERT INTO discord_profiles (
          user_id, discord_id, discord_username, discord_discriminator,
          discord_avatar, access_token, refresh_token, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await db.query(query, [
        profileData.user_id,
        profileData.discord_id,
        profileData.discord_username,
        profileData.discord_discriminator,
        profileData.discord_avatar,
        profileData.access_token,
        profileData.refresh_token,
        profileData.expires_at,
      ]);

      logger.info("Discord profile created successfully", {
        profileId: result.rows[0].id,
        userId: profileData.user_id,
      });
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to create discord profile", { error, profileData });
      throw error;
    }
  }

  async findByDiscordId(
    discordId: string,
  ): Promise<DiscordProfileEntity | null> {
    try {
      const query = "SELECT * FROM discord_profiles WHERE discord_id = $1";
      const result = await db.query(query, [discordId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error("Failed to find discord profile by discord id", {
        error,
        discordId,
      });
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<DiscordProfileEntity | null> {
    try {
      const query = "SELECT * FROM discord_profiles WHERE user_id = $1";
      const result = await db.query(query, [userId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error("Failed to find discord profile by user id", {
        error,
        userId,
      });
      throw error;
    }
  }

  async updateGuildJoined(
    discordId: string,
    joined: boolean,
  ): Promise<DiscordProfileEntity> {
    try {
      const query = `
        UPDATE discord_profiles 
        SET guild_joined = $1, updated_at = CURRENT_TIMESTAMP
        WHERE discord_id = $2
        RETURNING *
      `;

      const result = await db.query(query, [joined, discordId]);

      logger.info("Discord profile guild status updated", {
        discordId,
        joined,
      });
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to update guild joined status", {
        error,
        discordId,
        joined,
      });
      throw error;
    }
  }

  async updateTokens(
    discordId: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: Date,
  ): Promise<DiscordProfileEntity> {
    try {
      const query = `
        UPDATE discord_profiles 
        SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = CURRENT_TIMESTAMP
        WHERE discord_id = $4
        RETURNING *
      `;

      const result = await db.query(query, [
        accessToken,
        refreshToken,
        expiresAt,
        discordId,
      ]);

      logger.info("Discord profile tokens updated", { discordId });
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to update discord profile tokens", {
        error,
        discordId,
      });
      throw error;
    }
  }

  async updateProfile(
    discordId: string,
    updates: {
      discord_username?: string;
      discord_discriminator?: string;
      discord_avatar?: string;
    },
  ): Promise<DiscordProfileEntity> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
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
      values.push(discordId);

      const query = `
        UPDATE discord_profiles 
        SET ${fields.join(", ")}
        WHERE discord_id = $${paramCount}
        RETURNING *
      `;

      const result = await db.query(query, values);

      logger.info("Discord profile updated", { discordId, updates });
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to update discord profile", {
        error,
        discordId,
        updates,
      });
      throw error;
    }
  }

  async delete(userId: string): Promise<boolean> {
    try {
      const query = "DELETE FROM discord_profiles WHERE user_id = $1";
      const result = await db.query(query, [userId]);

      const success = (result.rowCount ?? 0) > 0;
      if (success) {
        logger.info("Discord profile deleted", { userId });
      }

      return success;
    } catch (error) {
      logger.error("Failed to delete discord profile", { error, userId });
      throw error;
    }
  }
}

export const discordProfileRepository = new DiscordProfileRepository();
