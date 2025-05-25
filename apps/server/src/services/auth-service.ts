import { AuthResult, AuthUser, UserRole } from "@workspace/types/api";
import {
  User,
  discordProfileRepository,
  userRepository,
} from "@workspace/database";
import jwt, { Secret, SignOptions } from "jsonwebtoken";

import config from "@/utils/config";
import { createLogger } from "@workspace/utils/logger";
import { discordService } from "./discord-service";

const logger = createLogger("auth-service");

export class AuthService {
  async authenticateWithDiscord(code: string): Promise<AuthResult> {
    try {
      logger.info("Starting Discord authentication");

      // Exchange code for tokens
      const tokenData = await discordService.exchangeCodeForToken(code);
      logger.info("Discord token exchange successful");

      // Get Discord user info
      const discordUser = await discordService.getUser(tokenData.access_token);
      logger.info("Discord user fetched", {
        discordId: discordUser.id,
        username: discordUser.username,
      });

      // Check if Discord profile already exists
      let discordProfile = await discordProfileRepository.findByDiscordId(
        discordUser.id,
      );
      let user: User | null = null;
      let isNewUser = false;

      if (discordProfile) {
        logger.info("Existing Discord profile found", {
          discordId: discordUser.id,
        });

        // Update existing tokens
        discordProfile = await discordProfileRepository.updateTokens(
          discordUser.id,
          tokenData.access_token,
          tokenData.refresh_token,
          new Date(Date.now() + tokenData.expires_in * 1000),
        );

        user = await userRepository.findById(discordProfile.user_id);
      } else {
        // Create new user with newbie role
        isNewUser = true;
        logger.info("Creating new user and Discord profile", {
          discordId: discordUser.id,
        });

        user = await userRepository.create({
          email: discordUser.email,
          username: discordUser.username,
          avatar_url: discordUser.avatar
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : undefined,
          role: UserRole.NEWBIE,
        });

        discordProfile = await discordProfileRepository.create({
          user_id: user.id,
          discord_id: discordUser.id,
          discord_username: discordUser.username,
          discord_discriminator: discordUser.discriminator,
          discord_avatar: discordUser.avatar,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
        });
      }

      // Check if user exists
      if (!user) {
        throw new Error("User not found during authentication");
      }

      // Try to add user to Discord guild with role assignment
      logger.info("Attempting to add user to Discord guild");
      const guildJoined = await discordService.addUserToGuild(
        tokenData.access_token,
        discordUser.id,
        user.role,
      );

      if (guildJoined) {
        await discordProfileRepository.updateGuildJoined(discordUser.id, true);
        logger.info("User successfully added to guild with role", {
          role: user.role,
        });
      } else {
        logger.warn("Failed to add user to guild");
      }

      // Generate JWT token
      const jwtToken = jwt.sign(
        {
          userId: user.id,
          discordId: discordUser.id,
          role: user.role,
        },
        config.env.jwt.secret as Secret,
        { expiresIn: config.env.jwt.expiresIn } as SignOptions,
      );

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar_url: user.avatar_url,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
        discordProfile: {
          ...discordProfile,
          guild_joined: guildJoined,
        },
      };

      logger.info("Discord authentication completed successfully", {
        userId: user?.id,
        discordId: discordUser.id,
        isNewUser,
        guildJoined,
        role: user.role,
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
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error(
        `Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    try {
      // Update role in database
      const user = await userRepository.updateRole(userId, newRole);

      // Get user's Discord profile
      const discordProfile =
        await discordProfileRepository.findByUserId(userId);

      if (discordProfile && discordProfile.guild_joined) {
        // Update role in Discord server
        const roleAssigned = await discordService.assignRoleToUser(
          discordProfile.discord_id,
          newRole,
        );

        if (roleAssigned) {
          logger.info(
            "User role updated successfully in both database and Discord",
            {
              userId,
              newRole,
              discordId: discordProfile.discord_id,
            },
          );
        } else {
          logger.warn(
            "User role updated in database but failed to update in Discord",
            {
              userId,
              newRole,
              discordId: discordProfile.discord_id,
            },
          );
        }
      } else {
        logger.info(
          "User role updated in database only (not in Discord server)",
          {
            userId,
            newRole,
          },
        );
      }

      return true;
    } catch (error) {
      logger.error("Failed to update user role", { error, userId, newRole });
      throw error;
    }
  }

  verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, config.env.jwt.secret);
      return decoded;
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  async getUserProfile(userId: string): Promise<AuthUser | null> {
    try {
      const userWithProfile =
        await userRepository.findWithDiscordProfile(userId);
      return userWithProfile;
    } catch (error) {
      logger.error("Failed to get user profile", { error, userId });
      throw error;
    }
  }
}

export const authService = new AuthService();
