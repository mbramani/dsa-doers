import {
  AuthResult,
  AuthUser,
  DiscordProfile,
  User,
  UserRole,
} from "@/types/api";
import { CreateDiscordProfileData, CreateUserData } from "@/types/service";
import {
  DiscordProfileEntity,
  UserEntity,
  UserWithTagsQuery,
} from "@/types/database";
import { discordProfileRepository, userRepository } from "@/database";
import jwt, { Secret, SignOptions } from "jsonwebtoken";

import config from "@/utils/config";
import { createLogger } from "@/utils/logger";
import { discordService } from "./discord-service";
import { tagService } from "./tag-service";

const logger = createLogger("auth-service");

export class AuthService {
  async authenticateWithDiscord(code: string): Promise<AuthResult> {
    try {
      // Exchange code for tokens
      const tokenData = await discordService.exchangeCodeForToken(code);

      // Get Discord user info
      const discordUser = await discordService.getUser(tokenData.access_token);

      // Check if Discord profile already exists
      let discordProfileEntity = await discordProfileRepository.findByDiscordId(
        discordUser.id,
      );
      let userEntity: UserEntity | null = null;
      let isNewUser = false;

      if (discordProfileEntity) {
        // Update existing tokens
        discordProfileEntity = await discordProfileRepository.updateTokens(
          discordUser.id,
          tokenData.access_token,
          tokenData.refresh_token,
          new Date(Date.now() + tokenData.expires_in * 1000),
        );

        userEntity = await userRepository.findById(
          discordProfileEntity.user_id,
        );
      } else {
        // Create new user with newbie role
        isNewUser = true;

        const createUserData: CreateUserData = {
          email: discordUser.email,
          username: discordUser.username,
          avatar_url: discordUser.avatar
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : undefined,
          role: UserRole.NEWBIE,
        };

        userEntity = await userRepository.create(createUserData);

        const createDiscordProfileData: CreateDiscordProfileData = {
          user_id: userEntity.id,
          discord_id: discordUser.id,
          discord_username: discordUser.username,
          discord_discriminator: discordUser.discriminator,
          discord_avatar: discordUser.avatar,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
        };

        discordProfileEntity = await discordProfileRepository.create(
          createDiscordProfileData,
        );
      }

      // Check if user exists
      if (!userEntity) {
        throw new Error("User not found during authentication");
      }

      // Try to add user to Discord guild with role assignment
      const guildJoined = await discordService.addUserToGuild(
        tokenData.access_token,
        discordUser.id,
        userEntity.role as UserRole,
      );

      if (guildJoined) {
        await discordProfileRepository.updateGuildJoined(discordUser.id, true);
        discordProfileEntity.guild_joined = true;

        // Sync user's tags with Discord roles when they join the guild
        await tagService.syncUserTagsWithDiscord(userEntity.id);
      } else {
        logger.warn("Failed to add user to guild", {
          discordId: discordUser.id,
        });
      }

      // Generate JWT token
      const jwtToken = this.generateJWT({
        userId: userEntity.id,
        discordId: discordUser.id,
        role: userEntity.role as UserRole,
      });

      // Convert to API types
      const user: User = this.convertUserEntityToAPI(userEntity);
      const discordProfile: DiscordProfile =
        this.convertDiscordProfileEntityToAPI(discordProfileEntity);

      const authUser: AuthUser = {
        ...user,
        discordProfile,
      };

      logger.info("Authentication completed", {
        userId: user.id,
        isNewUser,
        guildJoined,
      });

      return {
        user: authUser,
        token: jwtToken,
        isNewUser,
        discordInviteUrl: !guildJoined
          ? discordService.getInviteUrl()
          : undefined,
      };
    } catch (error) {
      logger.error("Discord authentication failed", {
        error: error instanceof Error ? error.message : error,
      });
      throw new Error(
        `Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async refreshDiscordToken(userId: string): Promise<boolean> {
    try {
      const discordProfileEntity =
        await discordProfileRepository.findByUserId(userId);

      if (!discordProfileEntity || !discordProfileEntity.refresh_token) {
        logger.warn("No Discord profile or refresh token found", { userId });
        return false;
      }

      // Check if token is expired
      if (
        discordProfileEntity.expires_at &&
        discordProfileEntity.expires_at > new Date()
      ) {
        logger.info("Discord token still valid", { userId });
        return true;
      }

      // Refresh the token
      const tokenData = await discordService.refreshAccessToken(
        discordProfileEntity.refresh_token,
      );

      // Update tokens in database
      await discordProfileRepository.updateTokens(
        discordProfileEntity.discord_id,
        tokenData.access_token,
        tokenData.refresh_token,
        new Date(Date.now() + tokenData.expires_in * 1000),
      );

      logger.info("Discord token refreshed successfully", { userId });
      return true;
    } catch (error) {
      logger.error("Failed to refresh Discord token", { error, userId });
      return false;
    }
  }

  async updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    try {
      // Update role in database
      const userEntity = await userRepository.updateRole(userId, newRole);

      // Get user's Discord profile
      const discordProfileEntity =
        await discordProfileRepository.findByUserId(userId);

      if (discordProfileEntity && discordProfileEntity.guild_joined) {
        // Update role in Discord server
        const roleAssigned = await discordService.assignRoleToUser(
          discordProfileEntity.discord_id,
          newRole,
        );

        if (!roleAssigned) {
          logger.warn("Failed to update role in Discord", {
            userId,
            discordId: discordProfileEntity.discord_id,
            newRole,
          });
        } else {
          logger.info("Role updated successfully", {
            userId,
            discordId: discordProfileEntity.discord_id,
            oldRole: userEntity.role,
            newRole,
          });
        }
      }

      return true;
    } catch (error) {
      logger.error("Failed to update user role", { error, userId, newRole });
      throw error;
    }
  }

  async removeUserDiscordAccess(
    userId: string,
    reason?: string,
  ): Promise<boolean> {
    try {
      const discordProfileEntity =
        await discordProfileRepository.findByUserId(userId);

      if (!discordProfileEntity) {
        logger.warn("No Discord profile found for user", { userId });
        return false;
      }

      // Remove from Discord guild if they're in it
      if (discordProfileEntity.guild_joined) {
        const removed = await discordService.removeUserFromGuild(
          discordProfileEntity.discord_id,
          reason,
        );

        if (removed) {
          await discordProfileRepository.updateGuildJoined(
            discordProfileEntity.discord_id,
            false,
          );
        }
      }

      // Optionally delete the Discord profile entirely
      // await discordProfileRepository.delete(userId);

      logger.info("User Discord access removed", { userId, reason });
      return true;
    } catch (error) {
      logger.error("Failed to remove user Discord access", { error, userId });
      throw error;
    }
  }

  verifyToken(token: string): any {
    try {
      const decoded = jwt.verify(token, config.env.jwt.secret);
      return decoded;
    } catch (error) {
      logger.error("Token verification failed", { error });
      throw new Error("Invalid or expired token");
    }
  }

  generateJWT(payload: {
    userId: string;
    discordId: string;
    role: UserRole;
  }): string {
    try {
      return jwt.sign(
        payload,
        config.env.jwt.secret as Secret,
        { expiresIn: config.env.jwt.expiresIn } as SignOptions,
      );
    } catch (error) {
      logger.error("JWT generation failed", { error });
      throw new Error("Failed to generate authentication token");
    }
  }

  async getUserProfile(userId: string): Promise<AuthUser | null> {
    try {
      const userWithProfile =
        await userRepository.findWithDiscordProfile(userId);

      if (!userWithProfile) {
        return null;
      }

      // Convert to API types
      const user: User = this.convertUserEntityToAPI(userWithProfile);

      const authUser: AuthUser = {
        ...user,
        discordProfile: userWithProfile.discordProfile
          ? this.convertDiscordProfileEntityToAPI(
              userWithProfile.discordProfile as DiscordProfileEntity,
            )
          : undefined,
      };

      return authUser;
    } catch (error) {
      logger.error("Failed to get user profile", { error, userId });
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const userEntity = await userRepository.findById(userId);

      if (!userEntity) {
        return null;
      }

      return this.convertUserEntityToAPI(userEntity);
    } catch (error) {
      logger.error("Failed to get user by ID", { error, userId });
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const userEntity = await userRepository.findByEmail(email);

      if (!userEntity) {
        return null;
      }

      return this.convertUserEntityToAPI(userEntity);
    } catch (error) {
      logger.error("Failed to get user by email", { error, email });
      throw error;
    }
  }

  async updateUserProfile(
    userId: string,
    updates: {
      username?: string;
      avatar_url?: string;
    },
  ): Promise<User | null> {
    try {
      // For now, we'll only allow username updates
      // Avatar URL should come from Discord
      if (updates.username) {
        // You'd need to add an update method to userRepository
        // const userEntity = await userRepository.update(userId, { username: updates.username });
        // return this.convertUserEntityToAPI(userEntity);
      }

      logger.warn("User profile update not implemented", { userId, updates });
      return null;
    } catch (error) {
      logger.error("Failed to update user profile", { error, userId, updates });
      throw error;
    }
  }

  async syncUserWithDiscord(userId: string): Promise<boolean> {
    try {
      const discordProfileEntity =
        await discordProfileRepository.findByUserId(userId);

      if (!discordProfileEntity) {
        logger.warn("No Discord profile found for sync", { userId });
        return false;
      }

      // Refresh token if needed
      const tokenRefreshed = await this.refreshDiscordToken(userId);
      if (!tokenRefreshed) {
        logger.warn("Failed to refresh Discord token for sync", { userId });
        return false;
      }

      // Get updated Discord user info
      if (!discordProfileEntity.access_token) {
        logger.warn("No access token available for Discord sync", { userId });
        return false;
      }

      const discordUser = await discordService.getUser(
        discordProfileEntity.access_token,
      );

      // Update Discord profile with latest info
      await discordProfileRepository.updateProfile(
        discordProfileEntity.discord_id,
        {
          discord_username: discordUser.username,
          discord_discriminator: discordUser.discriminator,
          discord_avatar: discordUser.avatar,
        },
      );

      // Check if user is still in guild and has correct role
      const userEntity = await userRepository.findById(userId);
      if (userEntity && discordProfileEntity.guild_joined) {
        const isInGuild = await discordService.isUserInGuild(
          discordProfileEntity.discord_id,
        );

        if (!isInGuild) {
          // User left the guild, update our records
          await discordProfileRepository.updateGuildJoined(
            discordProfileEntity.discord_id,
            false,
          );
        } else {
          // Ensure user has correct role
          await discordService.assignRoleToUser(
            discordProfileEntity.discord_id,
            userEntity.role as UserRole,
          );

          // Sync user's tags with Discord roles
          await tagService.syncUserTagsWithDiscord(userId);
        }
      }

      logger.info("User synced with Discord successfully", { userId });
      return true;
    } catch (error) {
      logger.error("Failed to sync user with Discord", { error, userId });
      return false;
    }
  }

  async softDeleteUser(userId: string): Promise<boolean> {
    try {
      // Soft delete user
      const success = await userRepository.softDelete(userId);

      if (success) {
        // Remove Discord access if they have it
        await this.removeUserDiscordAccess(userId, "User account deleted");

        logger.info("User soft deleted successfully", { userId });
      }

      return success;
    } catch (error) {
      logger.error("Failed to soft delete user", { error, userId });
      throw error;
    }
  }

  async getAllUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<{
    users: AuthUser[];
    total: number;
    pages: number;
  }> {
    try {
      const usersWithProfiles = await userRepository.findAllWithDiscordProfiles(
        page,
        limit,
        search,
      );
      const totalUsers = await userRepository.getTotalCount(search);

      const users: AuthUser[] = usersWithProfiles.map((userWithProfile) => {
        const user: User = this.convertUserEntityToAPI(userWithProfile);

        return {
          ...user,
          discordProfile: userWithProfile.discordProfile
            ? this.convertDiscordProfileEntityToAPI(
                userWithProfile.discordProfile as DiscordProfileEntity,
              )
            : undefined,
          tags:
            userWithProfile.tags?.map((tag) => ({
              ...tag,
              assigned_by: tag.assigned_by || undefined,
              notes: tag.notes || undefined,
            })) || undefined,
        };
      });

      return {
        users,
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit),
      };
    } catch (error) {
      logger.error("Failed to get all users", { error, page, limit, search });
      throw error;
    }
  }

  async getDashboardStats(): Promise<any> {
    try {
      return await userRepository.getDashboardStats();
    } catch (error) {
      logger.error("Failed to get dashboard stats", { error });
      throw error;
    }
  }

  // Helper method to convert UserEntity to API User type
  private convertUserEntityToAPI(entity: UserEntity | UserWithTagsQuery): User {
    return {
      id: entity.id,
      email: entity.email || undefined,
      username: entity.username,
      avatar_url: entity.avatar_url || undefined,
      role: entity.role as UserRole,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    };
  }

  // Helper method to convert DiscordProfileEntity to API DiscordProfile type
  private convertDiscordProfileEntityToAPI(
    entity: DiscordProfileEntity,
  ): DiscordProfile {
    return {
      id: entity.id,
      user_id: entity.user_id,
      discord_id: entity.discord_id,
      discord_username: entity.discord_username,
      discord_discriminator: entity.discord_discriminator || undefined,
      discord_avatar: entity.discord_avatar || undefined,
      guild_joined: entity.guild_joined,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    };
  }
}

export const authService = new AuthService();
