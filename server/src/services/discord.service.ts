import {
  Client,
  Role as DiscordRole,
  GatewayIntentBits,
  Guild,
  PermissionFlagsBits,
} from "discord.js";
import { DiscordTokenResponse, DiscordUser } from "../types/auth";

import { DiscordServiceResult } from "../types/auth";
import { discordConfig } from "../utils/config";
import { logger } from "../utils/logger";

interface CreateRoleData {
  name: string;
  color: string;
  permissions: string[];
  hoist: boolean;
  mentionable: boolean;
  reason?: string;
}

interface DiscordRoleData {
  id: string;
  name: string;
  color: number;
  permissions: string;
  hoist: boolean;
  mentionable: boolean;
}

export class DiscordService {
  private client: Client;
  private guild: Guild | null = null;
  private isInitialized = false;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
      ],
    });
    this.initialize();
  }

  public async initialize(): Promise<void> {
    try {
      if (!discordConfig.token) {
        throw new Error("Discord bot token is required");
      }

      await this.client.login(discordConfig.token);
      this.guild = await this.client.guilds.fetch(discordConfig.guildId);
      this.isInitialized = true;

      logger.info("Discord service initialized successfully", {
        guildId: discordConfig.guildId,
        guildName: this.guild.name,
        botUser: this.client.user?.username,
      });
    } catch (error) {
      logger.error("Failed to initialize Discord service", {
        error: error instanceof Error ? error.message : "Unknown error",
        guildId: discordConfig.guildId,
      });
    }
  }

  public async createRole(
    roleData: CreateRoleData,
  ): Promise<DiscordServiceResult<DiscordRoleData>> {
    try {
      if (!this.isInitialized || !this.guild) {
        return {
          success: false,
          error: "Discord service not initialized",
        };
      }

      // Check if role already exists
      const existingRole = this.guild.roles.cache.find(
        (role) => role.name === roleData.name,
      );
      if (existingRole) {
        logger.info(`Discord role ${roleData.name} already exists`, {
          roleId: existingRole.id,
          roleName: existingRole.name,
        });

        return {
          success: true,
          data: {
            id: existingRole.id,
            name: existingRole.name,
            color: existingRole.color,
            permissions: existingRole.permissions.bitfield.toString(),
            hoist: existingRole.hoist,
            mentionable: existingRole.mentionable,
          },
        };
      }

      // Convert permission strings to Discord permission flags
      const permissions = this.convertPermissions(roleData.permissions);

      // Convert hex color to integer
      const colorInt = parseInt(roleData.color.replace("#", ""), 16);

      // Create the role
      const createdRole = await this.guild.roles.create({
        name: roleData.name,
        color: colorInt,
        permissions: permissions,
        hoist: roleData.hoist,
        mentionable: roleData.mentionable,
        reason: roleData.reason || "Created by DSA Doers platform",
      });

      logger.info("Discord role created successfully", {
        roleId: createdRole.id,
        roleName: createdRole.name,
        color: roleData.color,
        permissions: roleData.permissions,
      });

      return {
        success: true,
        data: {
          id: createdRole.id,
          name: createdRole.name,
          color: createdRole.color,
          permissions: createdRole.permissions.bitfield.toString(),
          hoist: createdRole.hoist,
          mentionable: createdRole.mentionable,
        },
      };
    } catch (error) {
      logger.error("Failed to create Discord role", {
        error: error instanceof Error ? error.message : "Unknown error",
        roleName: roleData.name,
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create Discord role",
      };
    }
  }

  public async updateRole(
    roleId: string,
    roleData: Partial<CreateRoleData>,
  ): Promise<DiscordServiceResult<DiscordRoleData>> {
    try {
      if (!this.isInitialized || !this.guild) {
        return {
          success: false,
          error: "Discord service not initialized",
        };
      }

      const role = await this.guild.roles.fetch(roleId);
      if (!role) {
        return {
          success: false,
          error: "Role not found in Discord server",
        };
      }

      // Prepare update data
      const updateData: any = {};

      if (roleData.name) {
        updateData.name = roleData.name;
      }

      if (roleData.color) {
        updateData.color = parseInt(roleData.color.replace("#", ""), 16);
      }

      if (roleData.permissions) {
        updateData.permissions = this.convertPermissions(roleData.permissions);
      }

      if (roleData.hoist !== undefined) {
        updateData.hoist = roleData.hoist;
      }

      if (roleData.mentionable !== undefined) {
        updateData.mentionable = roleData.mentionable;
      }

      if (roleData.reason) {
        updateData.reason = roleData.reason;
      } else {
        updateData.reason = "Updated by DSA Doers platform";
      }

      const updatedRole = await role.edit(updateData);

      logger.info("Discord role updated successfully", {
        roleId: updatedRole.id,
        roleName: updatedRole.name,
        updates: Object.keys(updateData),
      });

      return {
        success: true,
        data: {
          id: updatedRole.id,
          name: updatedRole.name,
          color: updatedRole.color,
          permissions: updatedRole.permissions.bitfield.toString(),
          hoist: updatedRole.hoist,
          mentionable: updatedRole.mentionable,
        },
      };
    } catch (error) {
      logger.error("Failed to update Discord role", {
        error: error instanceof Error ? error.message : "Unknown error",
        roleId,
        updateData: roleData,
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update Discord role",
      };
    }
  }

  public async deleteRole(
    roleId: string,
  ): Promise<DiscordServiceResult<boolean>> {
    try {
      if (!this.isInitialized || !this.guild) {
        return {
          success: false,
          error: "Discord service not initialized",
        };
      }

      const role = await this.guild.roles.fetch(roleId);
      if (!role) {
        return {
          success: false,
          error: "Role not found in Discord server",
        };
      }

      await role.delete("Deleted by DSA Doers platform");

      logger.info("Discord role deleted successfully", {
        roleId,
        roleName: role.name,
      });

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      logger.error("Failed to delete Discord role", {
        error: error instanceof Error ? error.message : "Unknown error",
        roleId,
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete Discord role",
      };
    }
  }

  public async assignRoleToUser(
    userId: string,
    roleId: string,
  ): Promise<DiscordServiceResult<boolean>> {
    try {
      if (!this.isInitialized || !this.guild) {
        return {
          success: false,
          error: "Discord service not initialized",
        };
      }

      // First, try to fetch the member
      let member;
      try {
        member = await this.guild.members.fetch(userId);
      } catch (error) {
        // If member not found, they might not be in the guild yet
        logger.warn("User not found in Discord guild during role assignment", {
          userId,
          roleId,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        return {
          success: false,
          error:
            "User not found in Discord server. Please ensure user has joined the server first.",
        };
      }

      const role = await this.guild.roles.fetch(roleId);
      if (!role) {
        return {
          success: false,
          error: "Role not found in Discord server",
        };
      }

      // Check if user already has the role
      if (member.roles.cache.has(roleId)) {
        logger.info("User already has Discord role", {
          userId,
          roleId,
          roleName: role.name,
          userName: member.user.username,
        });

        return {
          success: true,
          data: true,
        };
      }

      await member.roles.add(role, "Assigned by DSA Doers platform");

      logger.info("Discord role assigned to user", {
        userId,
        roleId,
        roleName: role.name,
        userName: member.user.username,
      });

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      logger.error("Failed to assign Discord role to user", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
        roleId,
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to assign Discord role",
      };
    }
  }

  private convertPermissions(permissions: string[]): bigint[] {
    const permissionMap: Record<string, bigint> = {
      ADMINISTRATOR: PermissionFlagsBits.Administrator,
      MANAGE_MESSAGES: PermissionFlagsBits.ManageMessages,
      MANAGE_CHANNELS: PermissionFlagsBits.ManageChannels,
      KICK_MEMBERS: PermissionFlagsBits.KickMembers,
      MUTE_MEMBERS: PermissionFlagsBits.MuteMembers,
      SEND_MESSAGES: PermissionFlagsBits.SendMessages,
      CONNECT: PermissionFlagsBits.Connect,
      SPEAK: PermissionFlagsBits.Speak,
      USE_EXTERNAL_EMOJIS: PermissionFlagsBits.UseExternalEmojis,
      PRIORITY_SPEAKER: PermissionFlagsBits.PrioritySpeaker,
      MANAGE_GUILD: PermissionFlagsBits.ManageGuild,
      MANAGE_ROLES: PermissionFlagsBits.ManageRoles,
      BAN_MEMBERS: PermissionFlagsBits.BanMembers,
      CREATE_INSTANT_INVITE: PermissionFlagsBits.CreateInstantInvite,
      CHANGE_NICKNAME: PermissionFlagsBits.ChangeNickname,
      MANAGE_NICKNAMES: PermissionFlagsBits.ManageNicknames,
      READ_MESSAGE_HISTORY: PermissionFlagsBits.ReadMessageHistory,
      VIEW_CHANNEL: PermissionFlagsBits.ViewChannel,
      ADD_REACTIONS: PermissionFlagsBits.AddReactions,
      ATTACH_FILES: PermissionFlagsBits.AttachFiles,
      EMBED_LINKS: PermissionFlagsBits.EmbedLinks,
      USE_EXTERNAL_STICKERS: PermissionFlagsBits.UseExternalStickers,
      MENTION_EVERYONE: PermissionFlagsBits.MentionEveryone,
    };

    return permissions
      .map((perm) => permissionMap[perm])
      .filter((perm) => perm !== undefined);
  }

  public async exchangeCodeForToken(
    code: string,
  ): Promise<DiscordServiceResult<DiscordTokenResponse>> {
    try {
      const response = await fetch("https://discord.com/api/v10/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: discordConfig.clientId,
          client_secret: discordConfig.clientSecret,
          grant_type: "authorization_code",
          code: code,
          redirect_uri: discordConfig.redirectUri,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error("Discord token exchange failed", {
          status: response.status,
          error: errorData,
        });

        return {
          success: false,
          error: `Token exchange failed: ${response.status}`,
          statusCode: response.status,
        };
      }

      const tokenData = (await response.json()) as DiscordTokenResponse;

      logger.info("Discord token exchange successful", {
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope,
      });

      return {
        success: true,
        data: tokenData,
      };
    } catch (error) {
      logger.error("Discord token exchange error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Network error occurred",
      };
    }
  }

  public async getUser(
    accessToken: string,
  ): Promise<DiscordServiceResult<DiscordUser>> {
    try {
      const response = await fetch("https://discord.com/api/v10/users/@me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error("Discord user fetch failed", {
          status: response.status,
          error: errorData,
        });

        return {
          success: false,
          error: `User fetch failed: ${response.status}`,
          statusCode: response.status,
        };
      }

      const userData = (await response.json()) as DiscordUser;

      logger.info("Discord user fetched successfully", {
        userId: userData.id,
        username: userData.username,
        hasEmail: !!userData.email,
      });

      return {
        success: true,
        data: userData,
      };
    } catch (error) {
      logger.error("Discord user fetch error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Network error occurred",
      };
    }
  }

  public async addUserToGuild(
    discordId: string,
    accessToken: string,
  ): Promise<DiscordServiceResult<boolean>> {
    try {
      if (!this.isInitialized || !this.guild) {
        return {
          success: false,
          error: "Discord bot is not ready",
        };
      }

      // Check if user is already in guild
      try {
        const existingMember = await this.guild.members.fetch(discordId);
        if (existingMember) {
          return {
            success: true,
            data: true,
          };
        }
      } catch (error) {
        // User not in guild, proceed with adding
      }

      // Add user to guild
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${discordConfig.guildId}/members/${discordId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${discordConfig.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            access_token: accessToken,
          }),
        },
      );

      if (response.status === 201 || response.status === 204) {
        logger.info("User added to Discord guild successfully", {
          discordId,
          guildId: discordConfig.guildId,
          status: response.status,
        });

        return {
          success: true,
          data: true,
        };
      } else {
        const errorData = await response.text();
        logger.error("Failed to add user to Discord guild", {
          status: response.status,
          error: errorData,
          discordId,
        });

        return {
          success: false,
          error: `Guild join failed: ${response.status}`,
          statusCode: response.status,
        };
      }
    } catch (error) {
      logger.error("Discord guild join error", {
        error: error instanceof Error ? error.message : "Unknown error",
        discordId,
      });

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Network error occurred",
      };
    }
  }

  public async syncUserRoles(
    userId: string,
    platformRoles: string[],
  ): Promise<
    DiscordServiceResult<{
      added: string[];
      removed: string[];
      errors: string[];
    }>
  > {
    try {
      if (!this.isInitialized || !this.guild) {
        return {
          success: false,
          error: "Discord service not initialized",
        };
      }

      // Fetch the member from Discord
      let member;
      try {
        member = await this.guild.members.fetch(userId);
      } catch (error) {
        logger.warn("User not found in Discord guild during role sync", {
          userId,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        return {
          success: false,
          error: "User not found in Discord server",
        };
      }

      const addedRoles: string[] = [];
      const removedRoles: string[] = [];
      const errors: string[] = [];

      // Get all syncable roles from the guild (exclude @everyone and managed roles)
      const guildRoles = this.guild.roles.cache.filter(
        (role) => !role.managed && role.name !== "@everyone",
      );

      // Find platform roles that exist in Discord
      const platformDiscordRoles = guildRoles.filter((role) =>
        platformRoles.includes(role.name),
      );

      // Find Discord roles that should be removed (user has them but not in platform roles)
      const currentUserRoles = member.roles.cache.filter(
        (role) => !role.managed && role.name !== "@everyone",
      );

      // Add missing platform roles to Discord
      for (const role of platformDiscordRoles.values()) {
        if (!member.roles.cache.has(role.id)) {
          try {
            await member.roles.add(role, "Role sync by DSA Doers platform");
            addedRoles.push(role.name);

            logger.info("Added Discord role during sync", {
              userId,
              roleId: role.id,
              roleName: role.name,
            });
          } catch (error) {
            const errorMsg = `Failed to add role ${role.name}: ${error instanceof Error ? error.message : "Unknown error"}`;
            errors.push(errorMsg);

            logger.error("Failed to add Discord role during sync", {
              userId,
              roleId: role.id,
              roleName: role.name,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      }

      // Remove Discord roles that are not in platform roles
      for (const role of currentUserRoles.values()) {
        if (!platformRoles.includes(role.name)) {
          try {
            await member.roles.remove(role, "Role sync by DSA Doers platform");
            removedRoles.push(role.name);

            logger.info("Removed Discord role during sync", {
              userId,
              roleId: role.id,
              roleName: role.name,
            });
          } catch (error) {
            const errorMsg = `Failed to remove role ${role.name}: ${error instanceof Error ? error.message : "Unknown error"}`;
            errors.push(errorMsg);

            logger.error("Failed to remove Discord role during sync", {
              userId,
              roleId: role.id,
              roleName: role.name,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      }

      logger.info("Discord role sync completed", {
        userId,
        addedCount: addedRoles.length,
        removedCount: removedRoles.length,
        errorCount: errors.length,
        addedRoles,
        removedRoles,
      });

      return {
        success: true,
        data: {
          added: addedRoles,
          removed: removedRoles,
          errors,
        },
      };
    } catch (error) {
      logger.error("Discord role sync error", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Role sync failed",
      };
    }
  }

  public async refreshToken(
    refreshToken: string,
  ): Promise<DiscordServiceResult<DiscordTokenResponse>> {
    try {
      const response = await fetch("https://discord.com/api/v10/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: discordConfig.clientId,
          client_secret: discordConfig.clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error("Discord token refresh failed", {
          status: response.status,
          error: errorData,
        });

        return {
          success: false,
          error: `Token refresh failed: ${response.status}`,
          statusCode: response.status,
        };
      }

      const tokenData = (await response.json()) as DiscordTokenResponse;

      return {
        success: true,
        data: tokenData,
      };
    } catch (error) {
      logger.error("Discord token refresh error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Network error occurred",
      };
    }
  }

  public getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: discordConfig.clientId,
      redirect_uri: discordConfig.redirectUri,
      response_type: "code",
      scope: "identify email guilds.join",
      prompt: "consent",
    });

    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  }

  public isReady(): boolean {
    return this.isInitialized && this.client.isReady();
  }
}

export const discordService = new DiscordService();
