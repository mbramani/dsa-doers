import { AssignTagData, CreateTagData, UpdateTagData } from "@/types/service";
import {
  SearchResult,
  Tag,
  TagCategory,
  TagLeaderboard,
  TagUsageStats,
  User,
  UserTag,
  UserTagStats,
} from "@/types/api";
import {
  TagEntity,
  UserTagEntity,
  UserTagWithTagQuery,
} from "@/types/database";
import {
  discordProfileRepository,
  tagRepository,
  userTagRepository,
} from "@/database";

import { createLogger } from "@/utils/logger";
import { discordService } from "./discord-service";

const logger = createLogger("tag-service");

export class TagService {
  // Create a new tag
  async createTag(data: CreateTagData): Promise<Tag> {
    try {
      // Validate tag name format (lowercase, alphanumeric, underscores)
      if (!/^[a-z0-9_]+$/.test(data.name)) {
        throw new Error(
          "Tag name must be lowercase alphanumeric with underscores only",
        );
      }

      // Check if tag already exists
      const existing = await tagRepository.findByName(data.name);
      if (existing) {
        throw new Error(`Tag "${data.name}" already exists`);
      }

      const tagEntity = await tagRepository.create({
        ...data,
        color: data.color || "#6B7280",
        icon: data.icon || "🏷️",
      });

      // Convert to API type
      const tag = this.convertTagEntityToAPI(tagEntity);

      logger.info("Tag created successfully", {
        tagId: tag.id,
        name: data.name,
      });
      return tag;
    } catch (error) {
      logger.error("Failed to create tag", { error, data });
      throw error;
    }
  }

  // Get all tags
  async getAllTags(): Promise<Tag[]> {
    try {
      const tagEntities = await tagRepository.findAll();
      return tagEntities.map((entity) => this.convertTagEntityToAPI(entity));
    } catch (error) {
      logger.error("Failed to get all tags", { error });
      throw error;
    }
  }

  // Get assignable tags
  async getAssignableTags(): Promise<Tag[]> {
    try {
      const tagEntities = await tagRepository.findAssignable();
      return tagEntities.map((entity) => this.convertTagEntityToAPI(entity));
    } catch (error) {
      logger.error("Failed to get assignable tags", { error });
      throw error;
    }
  }

  // Get tag by ID
  async getTagById(tagId: string): Promise<Tag | null> {
    try {
      const tagEntity = await tagRepository.findById(tagId);
      if (!tagEntity) return null;

      return this.convertTagEntityToAPI(tagEntity);
    } catch (error) {
      logger.error("Failed to get tag by ID", { error, tagId });
      throw error;
    }
  }

  // Update tag
  async updateTag(tagId: string, data: UpdateTagData): Promise<Tag | null> {
    try {
      if (data.name && !/^[a-z0-9_]+$/.test(data.name)) {
        throw new Error(
          "Tag name must be lowercase alphanumeric with underscores only",
        );
      }

      const tagEntity = await tagRepository.update(tagId, data);
      if (!tagEntity) return null;

      const tag = this.convertTagEntityToAPI(tagEntity);

      // If tag display name or color changed, sync with Discord
      if (data.display_name || data.color) {
        await this.syncTagWithDiscord(tag);
      }

      return tag;
    } catch (error) {
      logger.error("Failed to update tag", { error, tagId, data });
      throw error;
    }
  }

  // Delete tag
  async deleteTag(tagId: string): Promise<boolean> {
    try {
      // Get tag before deletion to remove Discord roles
      const tagEntity = await tagRepository.findById(tagId);
      if (tagEntity) {
        const tag = this.convertTagEntityToAPI(tagEntity);
        await this.removeTagFromAllDiscordUsers(tag);
      }

      return await tagRepository.delete(tagId);
    } catch (error) {
      logger.error("Failed to delete tag", { error, tagId });
      throw error;
    }
  }

  // Assign tag to user
  async assignTagToUser(data: AssignTagData): Promise<UserTag> {
    try {
      // Check if user already has this tag
      const existing = await userTagRepository.findByUserAndTag(
        data.user_id,
        data.tag_id,
      );
      if (existing) {
        if (existing.is_active) {
          throw new Error("User already has this tag");
        } else {
          // Reactivate the tag
          const reactivated = await userTagRepository.reactivate(existing.id);
          const userTag = this.convertUserTagEntityToAPI(reactivated);

          // Apply Discord role
          await this.applyTagToDiscordUser(data.user_id, data.tag_id);

          return userTag;
        }
      }

      // If setting as primary, remove other primary tags
      if (data.is_primary) {
        await userTagRepository.removePrimaryTags(data.user_id);
      }

      const userTagEntity = await userTagRepository.create(data);
      const userTag = this.convertUserTagEntityToAPI(userTagEntity);

      logger.info("Tag assigned to user", {
        userId: data.user_id,
        tagId: data.tag_id,
        assignedBy: data.assigned_by,
      });

      // Apply Discord role
      await this.applyTagToDiscordUser(data.user_id, data.tag_id);

      return userTag;
    } catch (error) {
      logger.error("Failed to assign tag to user", { error, data });
      throw error;
    }
  }

  // Bulk assign tag to multiple users
  async bulkAssignTag(
    userIds: string[],
    tagId: string,
    assignedBy?: string,
  ): Promise<UserTag[]> {
    try {
      const userTagEntities = await userTagRepository.bulkAssign(
        userIds,
        tagId,
        assignedBy,
      );
      const userTags = userTagEntities.map((entity) =>
        this.convertUserTagEntityToAPI(entity),
      );

      // Apply Discord roles to all users
      for (const userId of userIds) {
        await this.applyTagToDiscordUser(userId, tagId);
      }

      return userTags;
    } catch (error) {
      logger.error("Failed to bulk assign tag", { error, userIds, tagId });
      throw error;
    }
  }

  // Set primary tag for user
  async setPrimaryTag(userId: string, tagId: string): Promise<boolean> {
    try {
      return await userTagRepository.setPrimary(userId, tagId);
    } catch (error) {
      logger.error("Failed to set primary tag", { error, userId, tagId });
      throw error;
    }
  }

  // Remove tag from user
  async removeTagFromUser(userId: string, tagId: string): Promise<boolean> {
    try {
      const success = await userTagRepository.deactivate(userId, tagId);

      if (success) {
        logger.info("Tag removed from user", { userId, tagId });

        // Remove Discord role
        await this.removeTagFromDiscordUser(userId, tagId);
      }

      return success;
    } catch (error) {
      logger.error("Failed to remove tag from user", { error, userId, tagId });
      throw error;
    }
  }

  // Get user's tags
  async getUserTags(userId: string): Promise<UserTag[]> {
    try {
      const userTagEntities = await userTagRepository.findByUser(userId);
      return userTagEntities.map((entity) =>
        this.convertUserTagWithTagQueryToAPI(entity),
      );
    } catch (error) {
      logger.error("Failed to get user tags", { error, userId });
      throw error;
    }
  }

  // Get user's tag statistics
  async getUserTagStats(userId: string): Promise<UserTagStats[]> {
    try {
      const stats = await userTagRepository.getUserTagStats(userId);
      return stats;
    } catch (error) {
      logger.error("Failed to get user tag stats", { error, userId });
      throw error;
    }
  }

  // Search users by tag
  async getUsersByTag(tagName: string): Promise<User[]> {
    try {
      const userEntities = await userTagRepository.findUsersByTagName(tagName);
      return userEntities;
    } catch (error) {
      logger.error("Failed to get users by tag", { error, tagName });
      throw error;
    }
  }

  // Search user tags
  async searchUserTags(
    searchTerm: string,
    limit?: number,
  ): Promise<SearchResult[]> {
    try {
      const results = await userTagRepository.searchUserTags(searchTerm, limit);
      return results;
    } catch (error) {
      logger.error("Failed to search user tags", { error, searchTerm });
      throw error;
    }
  }

  // Get tag leaderboard
  async getTagLeaderboard(tagName?: string): Promise<TagLeaderboard[]> {
    try {
      const leaderboardQuery = await userTagRepository.getLeaderboard(tagName);
      return leaderboardQuery.map((row) => ({
        user_id: row.user_id,
        username: row.username,
        avatar_url: row.avatar_url || undefined,
        tag_count: parseInt(row.tag_count.toString()),
        primary_tag: row.primary_tag_name
          ? {
              name: row.primary_tag_name,
              display_name: row.primary_tag_display_name!,
              color: row.primary_tag_color!,
              icon: row.primary_tag_icon!,
            }
          : undefined,
      }));
    } catch (error) {
      logger.error("Failed to get tag leaderboard", { error, tagName });
      throw error;
    }
  }

  // Get tag usage statistics
  async getTagUsageStats(): Promise<TagUsageStats[]> {
    try {
      const statsQuery = await userTagRepository.getTagUsageStats();
      return statsQuery.map((row) => ({
        name: row.name,
        display_name: row.display_name,
        category: row.category as any, // Cast to TagCategory enum
        color: row.color,
        icon: row.icon,
        usage_count: row.usage_count,
        primary_count: row.primary_count,
        last_assigned: row.last_assigned || undefined,
      }));
    } catch (error) {
      logger.error("Failed to get tag usage stats", { error });
      throw error;
    }
  }

  // Get tags by category
  async getTagsByCategory(category: string): Promise<Tag[]> {
    try {
      const tagEntities = await tagRepository.findByCategory(category);
      return tagEntities.map((entity) => this.convertTagEntityToAPI(entity));
    } catch (error) {
      logger.error("Failed to get tags by category", { error, category });
      throw error;
    }
  }

  // Search tags
  async searchTags(searchTerm: string, limit?: number): Promise<Tag[]> {
    try {
      const tagEntities = await tagRepository.searchTags(searchTerm, limit);
      return tagEntities.map((entity) => this.convertTagEntityToAPI(entity));
    } catch (error) {
      logger.error("Failed to search tags", { error, searchTerm });
      throw error;
    }
  }

  // Get tag statistics
  async getTagStats(): Promise<any> {
    try {
      return await tagRepository.getTagStats();
    } catch (error) {
      logger.error("Failed to get tag stats", { error });
      throw error;
    }
  }

  // Sync user's tags with Discord roles
  async syncUserTagsWithDiscord(userId: string): Promise<boolean> {
    try {
      // Get user's Discord profile
      const discordProfile =
        await discordProfileRepository.findByUserId(userId);
      if (!discordProfile || !discordProfile.guild_joined) {
        logger.info("User not in Discord guild, skipping tag sync", { userId });
        return false;
      }

      // Get user's active tags
      const userTags = await this.getUserTags(userId);
      const activeTags = userTags.filter((ut) => ut.is_active && ut.tag);

      // Convert to format needed for Discord sync
      const tagsForDiscord = activeTags.map((ut) => ({
        name: ut.tag!.name,
        display_name: ut.tag!.display_name,
        color: ut.tag!.color,
        category: ut.tag!.category,
        is_active: ut.is_active,
      }));

      // Sync with Discord
      const success = await discordService.syncUserTagRoles(
        discordProfile.discord_id,
        tagsForDiscord,
      );

      if (success) {
        logger.info("User tags synced with Discord successfully", {
          userId,
          discordId: discordProfile.discord_id,
          tagCount: tagsForDiscord.length,
        });
      }

      return success;
    } catch (error) {
      logger.error("Failed to sync user tags with Discord", { error, userId });
      return false;
    }
  }

  // Private helper methods for Discord integration

  private async applyTagToDiscordUser(
    userId: string,
    tagId: string,
  ): Promise<void> {
    try {
      // Get user's Discord profile
      const discordProfile =
        await discordProfileRepository.findByUserId(userId);
      if (!discordProfile || !discordProfile.guild_joined) {
        logger.info("User not in Discord guild, skipping tag role assignment", {
          userId,
          tagId,
        });
        return;
      }

      // Get tag details
      const tag = await this.getTagById(tagId);
      if (!tag) {
        logger.error("Tag not found for Discord role assignment", { tagId });
        return;
      }

      // Apply Discord role
      const success = await discordService.applyTagRoleToUser(
        discordProfile.discord_id,
        tag.name,
        tag.display_name,
        tag.color,
        tag.category,
      );

      if (success) {
        logger.info("Tag role applied to Discord user", {
          userId,
          discordId: discordProfile.discord_id,
          tagName: tag.name,
        });
      }
    } catch (error) {
      logger.error("Failed to apply tag to Discord user", {
        error,
        userId,
        tagId,
      });
    }
  }

  private async removeTagFromDiscordUser(
    userId: string,
    tagId: string,
  ): Promise<void> {
    try {
      // Get user's Discord profile
      const discordProfile =
        await discordProfileRepository.findByUserId(userId);
      if (!discordProfile || !discordProfile.guild_joined) {
        logger.info("User not in Discord guild, skipping tag role removal", {
          userId,
          tagId,
        });
        return;
      }

      // Get tag details
      const tag = await this.getTagById(tagId);
      if (!tag) {
        logger.error("Tag not found for Discord role removal", { tagId });
        return;
      }

      // Remove Discord role
      const success = await discordService.removeTagRoleFromUser(
        discordProfile.discord_id,
        tag.name,
        tag.display_name,
      );

      if (success) {
        logger.info("Tag role removed from Discord user", {
          userId,
          discordId: discordProfile.discord_id,
          tagName: tag.name,
        });
      }
    } catch (error) {
      logger.error("Failed to remove tag from Discord user", {
        error,
        userId,
        tagId,
      });
    }
  }

  private async syncTagWithDiscord(tag: Tag): Promise<void> {
    try {
      // Get all users who have this tag
      const users = await this.getUsersByTag(tag.name);

      for (const user of users) {
        await this.syncUserTagsWithDiscord(user.id);
      }

      logger.info("Tag synced with Discord for all users", {
        tagName: tag.name,
        userCount: users.length,
      });
    } catch (error) {
      logger.error("Failed to sync tag with Discord", {
        error,
        tagName: tag.name,
      });
    }
  }

  private async removeTagFromAllDiscordUsers(tag: Tag): Promise<void> {
    try {
      // Get all users who have this tag
      const users = await this.getUsersByTag(tag.name);

      for (const user of users) {
        const discordProfile = await discordProfileRepository.findByUserId(
          user.id,
        );
        if (discordProfile && discordProfile.guild_joined) {
          await discordService.removeTagRoleFromUser(
            discordProfile.discord_id,
            tag.name,
            tag.display_name,
          );
        }
      }

      logger.info("Tag removed from all Discord users", {
        tagName: tag.name,
        userCount: users.length,
      });
    } catch (error) {
      logger.error("Failed to remove tag from all Discord users", {
        error,
        tagName: tag.name,
      });
    }
  }

  // Helper method to convert TagEntity to API Tag type
  private convertTagEntityToAPI(entity: TagEntity): Tag {
    return {
      id: entity.id,
      name: entity.name,
      display_name: entity.display_name,
      description: entity.description || undefined,
      category: entity.category as TagCategory,
      color: entity.color,
      icon: entity.icon,
      is_active: entity.is_active,
      is_assignable: entity.is_assignable,
      is_earnable: entity.is_earnable,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    };
  }

  // Helper method to convert UserTagEntity to API UserTag type
  private convertUserTagEntityToAPI(entity: UserTagEntity): UserTag {
    return {
      id: entity.id,
      user_id: entity.user_id,
      tag_id: entity.tag_id,
      assigned_by: entity.assigned_by || undefined,
      assigned_at: entity.assigned_at,
      is_active: entity.is_active,
      is_primary: entity.is_primary,
      notes: entity.notes || undefined,
      tag: undefined, // Simple entity doesn't have tag info
      assigned_by_user: undefined,
    };
  }

  // Helper method to convert UserTagWithTagQuery to API UserTag type
  private convertUserTagWithTagQueryToAPI(
    entity: UserTagWithTagQuery,
  ): UserTag {
    return {
      id: entity.id,
      user_id: entity.user_id,
      tag_id: entity.tag_id,
      assigned_by: entity.assigned_by || undefined,
      assigned_at: entity.assigned_at,
      is_active: entity.is_active,
      is_primary: entity.is_primary,
      notes: entity.notes || undefined,
      tag: {
        id: entity.tag_id,
        name: entity.tag_name,
        display_name: entity.tag_display_name,
        description: entity.tag_description || undefined,
        category: entity.tag_category as TagCategory,
        color: entity.tag_color,
        icon: entity.tag_icon,
        is_active: true, // Assume active since it's from query
        is_assignable: true, // Default values for missing fields
        is_earnable: false,
        created_at: new Date(), // These would need to come from a full tag join
        updated_at: new Date(),
      },
      assigned_by_user: entity.assigned_by_username
        ? {
            id: entity.assigned_by || "",
            username: entity.assigned_by_username,
          }
        : undefined,
    };
  }
}

export const tagService = new TagService();
