import { ActivityService, activityService } from "./activity.service";
import {
  AuthResult,
  CreateUserResult,
  DiscordTokenResponse,
  DiscordUser,
  JWTPayload,
  TokenStoreResult,
  UserWithRoles,
} from "../types/auth";
import jwt, { SignOptions } from "jsonwebtoken";

import { ServiceResult } from "../types/service";
import { discordService } from "./discord.service";
import { jwtConfig } from "../utils/config";
import { logger } from "../utils/logger";
import { prisma } from "./database.service";
import { roleService } from "./role.service";

export class AuthService {
  public getDiscordAuthUrl(): string {
    return discordService.getAuthUrl();
  }

  public generateJWT(payload: Omit<JWTPayload, "iat" | "exp">): string {
    try {
      return jwt.sign(payload, jwtConfig.secret, {
        expiresIn: jwtConfig.expiresIn,
        issuer: "dsa-doers",
      } as SignOptions);
    } catch (error) {
      logger.error("JWT generation failed:", error);
      throw new Error("Failed to generate authentication token");
    }
  }

  public verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, jwtConfig.secret, {
        issuer: "dsa-doers",
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error("Token has expired");
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error("Invalid token");
      } else {
        logger.error("Token verification failed:", error);
        throw new Error("Token verification failed");
      }
    }
  }

  public async handleDiscordCallback(
    code: string,
  ): Promise<ServiceResult<AuthResult>> {
    try {
      // Exchange code for tokens
      const tokenResult = await discordService.exchangeCodeForToken(code);
      if (!tokenResult.success) {
        return {
          success: false,
          error: "Failed to exchange Discord authorization code",
          details: { discordError: tokenResult.error },
        };
      }

      const tokens = tokenResult.data!;

      // Get Discord user data
      const userResult = await discordService.getUser(tokens.access_token);
      if (!userResult.success) {
        return {
          success: false,
          error: "Failed to fetch Discord user data",
          details: { discordError: userResult.error },
        };
      }

      const discordUser = userResult.data!;

      // Create or update user in database
      const userCreationResult = await this.createOrUpdateUser(discordUser);
      if (!userCreationResult.success) {
        return {
          success: false,
          error: userCreationResult.error,
          details: userCreationResult.details,
        };
      }

      const { user, isNewUser } = userCreationResult.data!;

      // Store/update OAuth tokens
      const tokenStoreResult = await this.storeOAuthTokens(user.id, tokens);
      if (!tokenStoreResult.success) {
        return {
          success: false,
          error: "Failed to store authentication tokens",
          details: { tokenError: tokenStoreResult.error },
        };
      }

      // Add user to Discord server if new
      if (isNewUser) {
        const guildJoinResult = await discordService.addUserToGuild(
          discordUser.id,
          tokens.access_token,
        );

        if (!guildJoinResult.success) {
          logger.warn(
            "Failed to add user to Discord server, but authentication succeeded",
            {
              userId: user.id,
              discordId: discordUser.id,
              error: guildJoinResult.error,
            },
          );
        }
      }

      // Sync Discord roles with platform roles
      const userPlatformRoles = user.userRoles.map((ur) => ur.role.name);
      const syncResult = await discordService.syncUserRoles(
        discordUser.id,
        userPlatformRoles,
      );
      if (!syncResult.success) {
        logger.warn("Failed to sync user roles with Discord", {
          userId: user.id,
          discordId: user.discordId,
          error: syncResult.error,
        });
      }

      // Generate JWT token
      const token = this.generateJWT({
        userId: user.id,
        discordId: user.discordId,
        discordUsername: user.discordUsername,
        roles: user.userRoles
          .filter((ur) => ur.role.sortOrder === 0)
          .map((ur) => ur.role.name),
      });

      return {
        success: true,
        data: {
          user,
          isNewUser,
          token,
        },
      };
    } catch (error) {
      logger.error("Discord callback handling failed:", error);

      return {
        success: false,
        error: "Authentication failed due to an unexpected error",
        details: {
          systemError: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  private async createOrUpdateUser(
    discordUser: DiscordUser,
  ): Promise<ServiceResult<CreateUserResult>> {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { discordId: discordUser.id },
        include: {
          userRoles: {
            include: { role: true },
            where: { revokedAt: null },
          },
        },
      });

      if (existingUser) {
        // Update existing user
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            discordUsername: discordUser.username,
            discordDiscriminator: discordUser.discriminator,
            discordAvatar: discordUser.avatar,
            email: discordUser.email,
          },
          include: {
            userRoles: {
              include: { role: true },
              where: { revokedAt: null },
            },
          },
        });

        return {
          success: true,
          data: { user: updatedUser, isNewUser: false },
        };
      } else {
        // Create new user
        const newUser = await prisma.user.create({
          data: {
            discordId: discordUser.id,
            discordUsername: discordUser.username,
            discordDiscriminator: discordUser.discriminator,
            discordAvatar: discordUser.avatar,
            email: discordUser.email,
          },
          include: {
            userRoles: {
              include: { role: true },
              where: { revokedAt: null },
            },
          },
        });

        // Automatically assign NEWBIE role to new users
        const newbieAssignResult = await roleService.assignNewbieRole(
          newUser.id,
        );
        if (!newbieAssignResult.success) {
          logger.warn(
            "Failed to assign NEWBIE role to new user:",
            newbieAssignResult.error,
          );
        }

        // Refresh user data to include the new role
        const userWithRoles = await prisma.user.findUnique({
          where: { id: newUser.id },
          include: {
            userRoles: {
              include: { role: true },
              where: { revokedAt: null },
            },
          },
        });

        // Log new user creation
        await activityService.logActivity({
          actorType: "SYSTEM",
          actionType: "USER_CREATED",
          entityType: "USER",
          entityId: newUser.id,
          details: {
            discordId: discordUser.id,
            discordUsername: discordUser.username,
            email: discordUser.email,
            newbieRoleAssigned: newbieAssignResult.success,
          },
        });

        return {
          success: true,
          data: { user: userWithRoles || newUser, isNewUser: true },
        };
      }
    } catch (error) {
      logger.error("User creation/update failed:", error);

      return {
        success: false,
        error: "Failed to create or update user account",
        details: {
          databaseError:
            error instanceof Error
              ? error.message
              : "Database operation failed",
        },
      };
    }
  }

  private async storeOAuthTokens(
    userId: string,
    tokens: DiscordTokenResponse,
  ): Promise<TokenStoreResult> {
    try {
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      await prisma.oAuthToken.upsert({
        where: {
          userId_provider: {
            userId,
            provider: "discord",
          },
        },
        update: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
          scope: tokens.scope,
        },
        create: {
          userId,
          provider: "discord",
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenType: tokens.token_type,
          expiresAt,
          scope: tokens.scope,
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      logger.error("OAuth token storage failed:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Token storage failed",
      };
    }
  }

  public async getUserById(
    userId: string,
  ): Promise<ServiceResult<UserWithRoles>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            include: { role: true },
            where: { revokedAt: null },
          },
        },
      });

      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      return {
        success: true,
        data: user as UserWithRoles,
      };
    } catch (error) {
      logger.error("Get user by ID failed:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Database query failed",
      };
    }
  }
}

export const authService = new AuthService();
