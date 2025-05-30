import {
  ChannelType,
  Client,
  Guild,
  GuildChannel,
  OverwriteType,
  PermissionFlagsBits,
  PermissionOverwrites,
  Role,
  StageChannel,
  VoiceChannel,
} from "discord.js";

import config from "@/utils/config";
import { createLogger } from "@/utils/logger";
import { discordService } from "./discord-service";

const logger = createLogger("discord-channel-service");

interface ChannelPermissionOverride {
  id: string;
  type: OverwriteType;
  allow: string[];
  deny: string[];
}

interface EventRoleOptions {
  hoist?: boolean;
  mentionable?: boolean;
  position?: number;
  permissions?: string[];
}

export class DiscordChannelService {
  private client: Client;
  private guild: Guild | null = null;

  constructor() {
    // Use the existing Discord client from the main service
    this.client = (discordService as any).client;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Wait for the main Discord service to initialize
      await this.waitForDiscordService();
      this.guild = await this.client.guilds.fetch(config.env.discord.guildId);

      logger.info("Discord channel service initialized successfully", {
        guildId: config.env.discord.guildId,
        guildName: this.guild.name,
      });
    } catch (error) {
      logger.error("Failed to initialize Discord channel service", {
        error,
        guildId: config.env.discord.guildId,
      });
    }
  }

  private async waitForDiscordService(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.client.isReady()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Grant voice channel access to a user for a specific event
   */
  async grantVoiceChannelAccess(
    guildId: string,
    channelId: string,
    discordUserId: string,
    eventRoleId?: string,
  ): Promise<boolean> {
    try {
      logger.info("Granting voice channel access", {
        guildId,
        channelId,
        discordUserId,
        eventRoleId,
      });

      const guild = await this.client.guilds.fetch(guildId);
      if (!guild) {
        logger.error("Guild not found", { guildId });
        return false;
      }

      // 1. First, check if user is in the guild
      let member;
      try {
        member = await guild.members.fetch(discordUserId);
      } catch (memberError) {
        logger.error("User not found in guild", {
          discordUserId,
          guildId,
          error: memberError,
        });
        return false;
      }

      if (!member) {
        logger.error("User is not a member of the guild", {
          discordUserId,
          guildId,
        });
        return false;
      }

      // 2. Get the voice channel
      const channel = await guild.channels.fetch(channelId);
      if (!channel || !channel.isVoiceBased()) {
        logger.error("Voice channel not found or invalid", {
          channelId,
          channelType: channel?.type,
        });
        return false;
      }

      // 3. Method 1: Use role-based access if eventRoleId is provided
      if (eventRoleId) {
        try {
          const role = await guild.roles.fetch(eventRoleId);
          if (role) {
            await member.roles.add(role, `Event access granted`);
            logger.info("Added event role to user", {
              discordUserId,
              roleId: eventRoleId,
              roleName: role.name,
            });
            return true;
          }
        } catch (roleError) {
          logger.warn(
            "Failed to add role, falling back to direct permissions",
            {
              eventRoleId,
              error: roleError,
            },
          );
        }
      }

      // 4. Method 2: Direct channel permission overwrites
      try {
        await channel.permissionOverwrites.create(
          member,
          {
            ViewChannel: true,
            Connect: true,
            Speak: true,
            Stream: false,
            UseVAD: true,
          },
          {
            reason: `Event access granted`,
            type: 1, // 1 = member, 0 = role
          },
        );

        logger.info(
          "Successfully granted voice channel access via permissions",
          {
            discordUserId,
            channelId,
            channelName: channel.name,
          },
        );

        return true;
      } catch (permError) {
        logger.error("Failed to create permission overwrite", {
          error: permError,
          discordUserId,
          channelId,
          errorCode: (permError as any)?.code,
          errorMessage: (permError as any)?.message,
        });
        return false;
      }
    } catch (error: any) {
      logger.error("Failed to grant voice channel access", {
        error,
        userId: discordUserId,
        channelId,
        guildId,
        errorCode: error?.code,
        errorMessage: error?.message,
      });
      return false;
    }
  }

  /**
   * Revoke voice channel access from a user
   */
  async revokeVoiceChannelAccess(
    guildId: string,
    channelId: string,
    userId: string,
    roleId?: string,
  ): Promise<boolean> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return false;
      }

      const channel = (await this.guild.channels.fetch(
        channelId,
      )) as GuildChannel;

      if (!channel) {
        logger.warn("Channel not found during access revocation", {
          channelId,
          guildId,
        });
        return true; // Consider it successful if channel doesn't exist
      }

      // Remove direct channel permissions
      try {
        await channel.permissionOverwrites.delete(
          userId,
          "Event ended or user left",
        );
      } catch (permError) {
        // User might not have had direct permissions, continue with role removal
        logger.debug("No direct permissions to remove for user", {
          userId,
          channelId,
        });
      }

      // Remove role if using role-based access
      if (roleId) {
        try {
          const member = await this.guild.members.fetch(userId);
          const role = await this.guild.roles.fetch(roleId);

          if (role && member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId, "Event access revoked");
            logger.info("Event role removed from user", {
              userId,
              roleId,
              roleName: role.name,
              channelId,
            });
          }
        } catch (roleError) {
          logger.warn(
            "Failed to remove event role, but direct permissions revoked",
            {
              userId,
              roleId,
              channelId,
              error: roleError,
            },
          );
        }
      }

      logger.info("Voice channel access revoked successfully", {
        userId,
        channelId,
        channelName: channel.name,
        roleId,
        guildId,
      });

      return true;
    } catch (error) {
      logger.error("Failed to revoke voice channel access", {
        error,
        userId,
        channelId,
        roleId,
        guildId,
        errorCode: (error as any)?.code,
      });
      return false;
    }
  }

  /**
   * Create a temporary event role with voice channel permissions
   */
  async createEventRole(
    guildId: string,
    eventTitle: string,
    channelId: string,
    options: EventRoleOptions = {},
  ): Promise<string | null> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return null;
      }

      const channel = (await this.guild.channels.fetch(
        channelId,
      )) as GuildChannel;

      if (!channel) {
        logger.error("Channel not found for event role creation", {
          channelId,
          guildId,
        });
        return null;
      }

      // Create role with event-specific name
      const roleName = `🎪 ${eventTitle}`;

      const role = await this.guild.roles.create({
        name: roleName,
        color: 0x00ae86, // Teal color for events
        permissions: [], // No server-wide permissions
        reason: `Temporary role for event: ${eventTitle}`,
        mentionable: options.mentionable || false,
        hoist: options.hoist || false,
      });

      // Set channel-specific permissions for the role
      await channel.permissionOverwrites.create(
        role.id,
        {
          ViewChannel: true,
          Connect: true,
          Speak: true,
          Stream: true,
          UseVAD: true,
        },
        {
          reason: `Event role permissions for ${eventTitle}`,
        },
      );

      logger.info("Event role created successfully", {
        roleId: role.id,
        roleName: role.name,
        eventTitle,
        channelId,
        channelName: channel.name,
        guildId,
      });

      return role.id;
    } catch (error) {
      logger.error("Failed to create event role", {
        error,
        eventTitle,
        channelId,
        guildId,
        errorCode: (error as any)?.code,
      });
      return null;
    }
  }

  /**
   * Delete temporary event role
   */
  async deleteEventRole(guildId: string, roleId: string): Promise<boolean> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return false;
      }

      const role = await this.guild.roles.fetch(roleId);

      if (!role) {
        logger.warn("Role not found during deletion", { roleId, guildId });
        return true; // Consider it successful if role doesn't exist
      }

      const roleName = role.name;
      await role.delete("Event completed - cleaning up temporary role");

      logger.info("Event role deleted successfully", {
        roleId,
        roleName,
        guildId,
      });

      return true;
    } catch (error) {
      logger.error("Failed to delete event role", {
        error,
        roleId,
        guildId,
        errorCode: (error as any)?.code,
      });
      return false;
    }
  }

  /**
   * Check if user currently has access to voice channel
   */
  async checkUserChannelAccess(
    guildId: string,
    channelId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return false;
      }

      const channel = (await this.guild.channels.fetch(
        channelId,
      )) as GuildChannel;
      const member = await this.guild.members.fetch(userId);

      if (!channel || !member) {
        return false;
      }

      const permissions = channel.permissionsFor(member);
      const hasAccess =
        permissions?.has([
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
        ]) || false;

      logger.debug("User channel access check completed", {
        userId,
        channelId,
        hasAccess,
        guildId,
      });

      return hasAccess;
    } catch (error) {
      logger.error("Failed to check user channel access", {
        error,
        userId,
        channelId,
        guildId,
        errorCode: (error as any)?.code,
      });
      return false;
    }
  }

  /**
   * Get all voice channels in the guild
   */
  async getVoiceChannels(): Promise<
    Array<{ id: string; name: string; type: string }>
  > {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return [];
      }

      const channels = this.guild.channels.cache
        .filter(
          (channel) =>
            channel.type === ChannelType.GuildVoice ||
            channel.type === ChannelType.GuildStageVoice,
        )
        .map((channel) => ({
          id: channel.id,
          name: channel.name,
          type: channel.type === ChannelType.GuildVoice ? "voice" : "stage",
        }));

      return Array.from(channels);
    } catch (error) {
      logger.error("Failed to get voice channels", {
        error,
        guildId: this.guild?.id,
      });
      return [];
    }
  }

  /**
   * Get current permission overrides for a channel
   */
  async getChannelPermissionOverrides(
    channelId: string,
  ): Promise<ChannelPermissionOverride[]> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return [];
      }

      const channel = (await this.guild.channels.fetch(
        channelId,
      )) as GuildChannel;

      if (!channel) {
        return [];
      }

      const overrides = channel.permissionOverwrites.cache.map((override) => ({
        id: override.id,
        type: override.type,
        allow: override.allow.toArray(),
        deny: override.deny.toArray(),
      }));

      return overrides;
    } catch (error) {
      logger.error("Failed to get channel permission overrides", {
        error,
        channelId,
      });
      return [];
    }
  }

  /**
   * Clean up all event-related roles (roles starting with 🎪)
   */
  async cleanupEventRoles(): Promise<{ deleted: number; errors: number }> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return { deleted: 0, errors: 0 };
      }

      const eventRoles = this.guild.roles.cache.filter(
        (role) => role.name.startsWith("🎪") && role.members.size === 0,
      );

      let deleted = 0;
      let errors = 0;

      for (const role of eventRoles.values()) {
        try {
          await role.delete("Cleanup: unused event role");
          deleted++;
          logger.info("Deleted unused event role", {
            roleId: role.id,
            roleName: role.name,
          });
        } catch (error) {
          errors++;
          logger.warn("Failed to delete unused event role", {
            roleId: role.id,
            roleName: role.name,
            error,
          });
        }
      }

      logger.info("Event role cleanup completed", {
        totalEventRoles: eventRoles.size,
        deleted,
        errors,
      });

      return { deleted, errors };
    } catch (error) {
      logger.error("Failed to cleanup event roles", { error });
      return { deleted: 0, errors: 1 };
    }
  }

  /**
   * Disconnect user from voice channel if they're in it
   */
  async disconnectUserFromVoice(
    userId: string,
    reason?: string,
  ): Promise<boolean> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return false;
      }

      const member = await this.guild.members.fetch(userId);

      if (member.voice.channel) {
        await member.voice.disconnect(reason || "Event access revoked");
        logger.info("User disconnected from voice channel", {
          userId,
          channelId: member.voice.channel.id,
          channelName: member.voice.channel.name,
          reason,
        });
        return true;
      }

      return false; // User wasn't in a voice channel
    } catch (error) {
      logger.error("Failed to disconnect user from voice", {
        error,
        userId,
        errorCode: (error as any)?.code,
      });
      return false;
    }
  }

  /**
   * Get users currently in a voice channel
   */
  async getUsersInVoiceChannel(
    channelId: string,
  ): Promise<Array<{ id: string; username: string; displayName: string }>> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return [];
      }

      const channel = (await this.guild.channels.fetch(channelId)) as
        | VoiceChannel
        | StageChannel;

      if (
        !channel ||
        (channel.type !== ChannelType.GuildVoice &&
          channel.type !== ChannelType.GuildStageVoice)
      ) {
        return [];
      }

      const users = channel.members.map((member) => ({
        id: member.user.id,
        username: member.user.username,
        displayName: member.displayName,
      }));

      return Array.from(users);
    } catch (error) {
      logger.error("Failed to get users in voice channel", {
        error,
        channelId,
      });
      return [];
    }
  }
}

export const discordChannelService = new DiscordChannelService();
