import { AuthResult, AuthUser, User, UserRole } from "@/types/api";
import { discordProfileRepository, userRepository } from "@/database";
import jwt, { Secret, SignOptions } from "jsonwebtoken";

import config from "@/utils/config";
import { createLogger } from "@/utils/logger";
import { discordService } from "./discord-service";

const logger = createLogger("auth-service");

export class AuthService {
  async authenticateWithDiscord(code: string): Promise<AuthResult> {
    try {
      // Exchange code for tokens
      const tokenData = await discordService.exchangeCodeForToken(code);

      // Get Discord user info
      const discordUser = await discordService.getUser(tokenData.access_token);

      // Check if Discord profile already exists
      let discordProfile = await discordProfileRepository.findByDiscordId(
        discordUser.id,
      );
      let user: User | null = null;
      let isNewUser = false;

      if (discordProfile) {
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
      const guildJoined = await discordService.addUserToGuild(
        tokenData.access_token,
        discordUser.id,
        user.role,
      );

      if (guildJoined) {
        await discordProfileRepository.updateGuildJoined(discordUser.id, true);
      } else {
        logger.warn("Failed to add user to guild", {
          discordId: discordUser.id,
        });
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

        if (!roleAssigned) {
          logger.warn("Failed to update role in Discord", {
            userId,
            discordId: discordProfile.discord_id,
          });
        }
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
