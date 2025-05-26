import {
  Client,
  GatewayIntentBits,
  Guild,
  GuildMember,
  Role,
} from "discord.js";

import { UserRole } from "@/types/api";
import config from "@/utils/config";
import { createLogger } from "@/utils/logger";

const logger = createLogger("discord-service");

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  email?: string;
}

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export class DiscordService {
  private client: Client;
  private guild: Guild | null = null;

  // Map internal roles to Discord role names
  private readonly roleMapping = {
    [UserRole.NEWBIE]: "🌱 Newbie",
    [UserRole.MEMBER]: "💙 Member",
    [UserRole.CONTRIBUTOR]: "💜 Contributor",
    [UserRole.MODERATOR]: "⚡ Moderator",
    [UserRole.ADMIN]: "👑 Admin",
  };

  constructor() {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    });
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await this.client.login(config.env.discord.botToken);
      this.guild = await this.client.guilds.fetch(config.env.discord.guildId);
      logger.info("Discord client initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Discord client", { error });
    }
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: config.env.discord.clientId,
      redirect_uri: config.env.discord.redirectUri,
      response_type: "code",
      scope: "identify email guilds.join",
    });

    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<DiscordTokenResponse> {
    try {
      const response = await fetch("https://discord.com/api/v10/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: config.env.discord.clientId,
          client_secret: config.env.discord.clientSecret,
          grant_type: "authorization_code",
          code: code,
          redirect_uri: config.env.discord.redirectUri,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error("Discord token exchange failed", {
          status: response.status,
          error: errorData,
        });
        throw new Error(`Discord token exchange failed: ${response.status}`);
      }

      return (await response.json()) as DiscordTokenResponse;
    } catch (error) {
      logger.error("Failed to exchange Discord code for token", { error });
      throw error;
    }
  }

  async getUser(accessToken: string): Promise<DiscordUser> {
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
        throw new Error(`Discord user fetch failed: ${response.status}`);
      }

      return (await response.json()) as DiscordUser;
    } catch (error) {
      logger.error("Failed to fetch Discord user", { error });
      throw error;
    }
  }

  async getGuildRoles(): Promise<Role[]> {
    try {
      if (!this.guild) {
        throw new Error("Guild not initialized");
      }

      const roles = await this.guild.roles.fetch();
      return Array.from(roles.values());
    } catch (error) {
      logger.error("Error fetching guild roles", { error });
      throw error;
    }
  }

  async createRoleIfNotExists(
    roleName: string,
    color: number = 0,
  ): Promise<string | null> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return null;
      }

      // Check if role already exists
      const existingRole = this.guild.roles.cache.find(
        (role) => role.name === roleName,
      );

      if (existingRole) {
        logger.info("Role already exists", {
          roleName,
          roleId: existingRole.id,
        });
        return existingRole.id;
      }

      // Create new role
      const newRole = await this.guild.roles.create({
        name: roleName,
        color: color,
        hoist: true,
        mentionable: false,
      });

      logger.info("Discord role created successfully", {
        roleName,
        roleId: newRole.id,
      });

      return newRole.id;
    } catch (error) {
      logger.error("Error creating Discord role", { error, roleName });
      return null;
    }
  }

  async setupGuildRoles(): Promise<Record<UserRole, string | null>> {
    const roleColors = {
      [UserRole.NEWBIE]: 0x00ff00, // Green
      [UserRole.MEMBER]: 0x0099ff, // Blue
      [UserRole.CONTRIBUTOR]: 0x9900ff, // Purple
      [UserRole.MODERATOR]: 0xffff00, // Yellow
      [UserRole.ADMIN]: 0xff0000, // Red
    };

    const roleIds: Record<UserRole, string | null> = {
      [UserRole.NEWBIE]: null,
      [UserRole.MEMBER]: null,
      [UserRole.CONTRIBUTOR]: null,
      [UserRole.MODERATOR]: null,
      [UserRole.ADMIN]: null,
    };

    for (const [userRole, discordRoleName] of Object.entries(
      this.roleMapping,
    )) {
      const roleId = await this.createRoleIfNotExists(
        discordRoleName,
        roleColors[userRole as UserRole],
      );
      roleIds[userRole as UserRole] = roleId;
    }

    return roleIds;
  }

  async getRoleIdByUserRole(userRole: UserRole): Promise<string | null> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return null;
      }

      const discordRoleName = this.roleMapping[userRole];
      const role = this.guild.roles.cache.find(
        (r) => r.name === discordRoleName,
      );

      return role?.id || null;
    } catch (error) {
      logger.error("Error getting role ID", { error, userRole });
      return null;
    }
  }

  async assignRoleToUser(userId: string, userRole: UserRole): Promise<boolean> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return false;
      }

      const roleId = await this.getRoleIdByUserRole(userRole);
      if (!roleId) {
        logger.error("Role not found for user role", { userRole });
        return false;
      }

      const member = await this.guild.members.fetch(userId);
      const role = this.guild.roles.cache.get(roleId);

      if (!role) {
        logger.error("Role not found", { roleId });
        return false;
      }

      // Remove all existing DSA roles first
      await this.removeAllDSARoles(userId);

      // Assign new role
      await member.roles.add(role, `Role assignment: ${userRole}`);

      logger.info("Role assigned successfully", { userId, userRole, roleId });
      return true;
    } catch (error) {
      logger.error("Error assigning role to user", { error, userId, userRole });
      return false;
    }
  }

  async removeAllDSARoles(userId: string): Promise<void> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return;
      }

      const member = await this.guild.members.fetch(userId);
      const dsaRoles = this.guild.roles.cache.filter((role) =>
        Object.values(this.roleMapping).includes(role.name),
      );

      await member.roles.remove(dsaRoles, "Role cleanup before new assignment");
    } catch (error) {
      logger.error("Error removing DSA roles", { error, userId });
    }
  }

  async addUserToGuild(
    accessToken: string,
    userId: string,
    userRole: UserRole = UserRole.NEWBIE,
  ): Promise<boolean> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return false;
      }

      logger.info("Adding user to Discord guild", {
        userId,
        guildId: config.env.discord.guildId,
      });

      await this.guild.members.add(userId, {
        accessToken: accessToken,
      });

      logger.info("User added to Discord guild successfully", { userId });

      // Assign role after successful guild join
      await this.assignRoleToUser(userId, userRole);

      return true;
    } catch (error) {
      logger.error("Error adding user to Discord guild", { error, userId });
      return false;
    }
  }

  getInviteUrl(): string {
    return (
      config.env.discord.inviteUrl ||
      `https://discord.gg/${config.env.discord.guildId}`
    );
  }
}

export const discordService = new DiscordService();
