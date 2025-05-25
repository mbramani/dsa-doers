import { UserRole } from "@workspace/types/api";
import config from "@/utils/config";
import { createLogger } from "@workspace/utils/logger";

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

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
}

export class DiscordService {
  private readonly baseUrl = "https://discord.com/api/v10";

  // Map internal roles to Discord role names
  private readonly roleMapping = {
    [UserRole.NEWBIE]: "🌱 Newbie",
    [UserRole.MEMBER]: "💙 Member",
    [UserRole.CONTRIBUTOR]: "💜 Contributor",
    [UserRole.MODERATOR]: "⚡ Moderator",
    [UserRole.ADMIN]: "👑 Admin",
  };

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: config.env.discord.clientId,
      redirect_uri: config.env.discord.redirectUri,
      response_type: "code",
      scope: "identify email guilds.join",
    });

    const authUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;
    return authUrl;
  }

  async exchangeCodeForToken(code: string): Promise<DiscordTokenResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/oauth2/token`, {
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
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(
          `Discord token exchange failed: ${response.status} - ${errorData}`,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error("Failed to exchange Discord code for token", {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async getUser(accessToken: string): Promise<DiscordUser> {
    try {
      const response = await fetch(`${this.baseUrl}/users/@me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error("Discord user fetch failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(
          `Discord user fetch failed: ${response.status} - ${errorData}`,
        );
      }

      const user = await response.json();
      return user;
    } catch (error) {
      logger.error("Failed to fetch Discord user", {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async getGuildRoles(): Promise<DiscordRole[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/guilds/${config.env.discord.guildId}/roles`,
        {
          headers: {
            Authorization: `Bot ${config.env.discord.botToken}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.text();
        logger.error("Failed to fetch guild roles", {
          status: response.status,
          error: errorData,
        });
        throw new Error(`Failed to fetch guild roles: ${response.status}`);
      }

      const roles = await response.json();
      return roles;
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
      // First check if role already exists
      const existingRoles = await this.getGuildRoles();
      const existingRole = existingRoles.find((role) => role.name === roleName);

      if (existingRole) {
        logger.info("Role already exists", {
          roleName,
          roleId: existingRole.id,
        });
        return existingRole.id;
      }

      // Create new role
      const response = await fetch(
        `${this.baseUrl}/guilds/${config.env.discord.guildId}/roles`,
        {
          method: "POST",
          headers: {
            Authorization: `Bot ${config.env.discord.botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: roleName,
            color: color,
            hoist: true, // Display role members separately
            mentionable: false,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.text();
        logger.error("Failed to create Discord role", {
          roleName,
          status: response.status,
          error: errorData,
        });
        return null;
      }

      const newRole = await response.json();
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
      const discordRoleName = this.roleMapping[userRole];
      const roles = await this.getGuildRoles();
      const role = roles.find((r) => r.name === discordRoleName);

      return role?.id || null;
    } catch (error) {
      logger.error("Error getting role ID", { error, userRole });
      return null;
    }
  }

  async assignRoleToUser(userId: string, userRole: UserRole): Promise<boolean> {
    try {
      const roleId = await this.getRoleIdByUserRole(userRole);

      if (!roleId) {
        logger.error("Role not found for user role", { userRole });
        return false;
      }

      // Remove all existing DSA Doers roles first
      await this.removeAllDSARoles(userId);

      // Assign new role
      const response = await fetch(
        `${this.baseUrl}/guilds/${config.env.discord.guildId}/members/${userId}/roles/${roleId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${config.env.discord.botToken}`,
            "X-Audit-Log-Reason": `Role assignment: ${userRole}`,
          },
        },
      );

      if (response.ok) {
        logger.info("Role assigned successfully", { userId, userRole, roleId });
        return true;
      } else {
        const errorData = await response.text();
        logger.error("Failed to assign role", {
          userId,
          userRole,
          roleId,
          status: response.status,
          error: errorData,
        });
        return false;
      }
    } catch (error) {
      logger.error("Error assigning role to user", { error, userId, userRole });
      return false;
    }
  }

  async removeAllDSARoles(userId: string): Promise<void> {
    try {
      const roles = await this.getGuildRoles();
      const dsaRoles = roles.filter((role) =>
        Object.values(this.roleMapping).includes(role.name),
      );

      for (const role of dsaRoles) {
        await fetch(
          `${this.baseUrl}/guilds/${config.env.discord.guildId}/members/${userId}/roles/${role.id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bot ${config.env.discord.botToken}`,
              "X-Audit-Log-Reason": "Role cleanup before new assignment",
            },
          },
        );
      }
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
      logger.info("Adding user to Discord guild", {
        userId,
        guildId: config.env.discord.guildId,
      });

      const response = await fetch(
        `${this.baseUrl}/guilds/${config.env.discord.guildId}/members/${userId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${config.env.discord.botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            access_token: accessToken,
          }),
        },
      );

      if (response.status === 201 || response.status === 204) {
        logger.info("User added to Discord guild successfully", { userId });

        // Assign role after successful guild join
        await this.assignRoleToUser(userId, userRole);

        return true;
      } else {
        const errorData = await response.text();
        logger.warn("Failed to add user to Discord guild", {
          userId,
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        return false;
      }
    } catch (error) {
      logger.error("Error adding user to Discord guild", {
        error: error instanceof Error ? error.message : error,
        userId,
      });
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
