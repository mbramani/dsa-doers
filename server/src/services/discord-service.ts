import {
  Client,
  GatewayIntentBits,
  Guild,
  GuildMember,
  PermissionResolvable,
  Role,
} from "discord.js";
import { TagCategory, UserRole } from "@/types/api";

import { CreateDiscordProfileData } from "@/types/service";
import { DiscordProfileEntity } from "@/types/database";
import config from "@/utils/config";
import { createLogger } from "@/utils/logger";

const logger = createLogger("discord-service");

// Discord API response types
interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  email?: string;
  global_name?: string;
}

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordGuildMember {
  user?: DiscordUser;
  nick?: string;
  avatar?: string;
  roles: string[];
  joined_at: string;
  premium_since?: string;
  deaf: boolean;
  mute: boolean;
  flags: number;
  pending?: boolean;
  permissions?: string;
  communication_disabled_until?: string;
}

interface AddGuildMemberOptions {
  accessToken: string;
  nick?: string;
  roles?: string[];
  mute?: boolean;
  deaf?: boolean;
}

interface CreateRoleOptions {
  name: string;
  color?: number;
  hoist?: boolean;
  mentionable?: boolean;
  permissions?: PermissionResolvable;
  icon?: string;
  unicode_emoji?: string;
}

export class DiscordService {
  private client: Client;
  private guild: Guild | null = null;

  // Map internal roles to Discord role names
  private readonly roleMapping: Record<UserRole, string> = {
    [UserRole.NEWBIE]: "🌱 Newbie",
    [UserRole.MEMBER]: "💙 Member",
    [UserRole.CONTRIBUTOR]: "💜 Contributor",
    [UserRole.MODERATOR]: "⚡ Moderator",
    [UserRole.ADMIN]: "👑 Admin",
  };

  private readonly roleColors: Record<UserRole, number> = {
    [UserRole.NEWBIE]: 0x00ff00, // Green
    [UserRole.MEMBER]: 0x0099ff, // Blue
    [UserRole.CONTRIBUTOR]: 0x9900ff, // Purple
    [UserRole.MODERATOR]: 0xffff00, // Yellow
    [UserRole.ADMIN]: 0xff0000, // Red
  };

  // Tag category colors for Discord roles
  private readonly tagCategoryColors: Record<TagCategory, number> = {
    [TagCategory.SKILL]: 0x3498db, // Blue
    [TagCategory.ACHIEVEMENT]: 0xf39c12, // Orange
    [TagCategory.SPECIAL]: 0xe74c3c, // Red
    [TagCategory.CONTEST]: 0x9b59b6, // Purple
    [TagCategory.COMMUNITY]: 0x2ecc71, // Green
  };

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

  private async initialize(): Promise<void> {
    try {
      await this.client.login(config.env.discord.botToken);
      this.guild = await this.client.guilds.fetch(config.env.discord.guildId);
      logger.info("Discord client initialized successfully", {
        guildId: config.env.discord.guildId,
        guildName: this.guild.name,
      });
    } catch (error) {
      logger.error("Failed to initialize Discord client", {
        error,
        botToken: config.env.discord.botToken ? "***" : "missing",
        guildId: config.env.discord.guildId,
      });
    }
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: config.env.discord.clientId,
      redirect_uri: config.env.discord.redirectUri,
      response_type: "code",
      scope: "identify email guilds.join",
      prompt: "consent",
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
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(
          `Discord token exchange failed: ${response.status} - ${errorData}`,
        );
      }

      const tokenData = (await response.json()) as DiscordTokenResponse;
      logger.info("Discord token exchange successful", {
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope,
      });

      return tokenData;
    } catch (error) {
      logger.error("Failed to exchange Discord code for token", { error });
      throw error;
    }
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<DiscordTokenResponse> {
    try {
      const response = await fetch("https://discord.com/api/v10/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: config.env.discord.clientId,
          client_secret: config.env.discord.clientSecret,
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
        throw new Error(`Discord token refresh failed: ${response.status}`);
      }

      return (await response.json()) as DiscordTokenResponse;
    } catch (error) {
      logger.error("Failed to refresh Discord token", { error });
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
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(
          `Discord user fetch failed: ${response.status} - ${errorData}`,
        );
      }

      const userData = (await response.json()) as DiscordUser;
      logger.info("Discord user fetched successfully", {
        userId: userData.id,
        username: userData.username,
        hasEmail: !!userData.email,
      });

      return userData;
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
      logger.info("Guild roles fetched", {
        guildId: this.guild.id,
        rolesCount: roles.size,
      });

      return Array.from(roles.values());
    } catch (error) {
      logger.error("Error fetching guild roles", { error });
      throw error;
    }
  }

  async createRoleIfNotExists(
    roleName: string,
    color: number = 0,
    options: Partial<CreateRoleOptions> = {},
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
          color: existingRole.color,
        });
        return existingRole.id;
      }

      // Create new role
      const roleOptions: CreateRoleOptions = {
        name: roleName,
        color: color,
        hoist: true,
        mentionable: false,
        ...options,
      };

      const newRole = await this.guild.roles.create(roleOptions);

      logger.info("Discord role created successfully", {
        roleName,
        roleId: newRole.id,
        color: newRole.color,
        position: newRole.position,
      });

      return newRole.id;
    } catch (error) {
      logger.error("Error creating Discord role", { error, roleName, color });
      return null;
    }
  }

  async setupGuildRoles(): Promise<Record<UserRole, string | null>> {
    logger.info("Setting up guild roles");

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
      const role = userRole as UserRole;
      const color = this.roleColors[role];

      const roleId = await this.createRoleIfNotExists(discordRoleName, color, {
        hoist: true,
        mentionable: role === UserRole.ADMIN || role === UserRole.MODERATOR,
      });

      roleIds[role] = roleId;

      if (roleId) {
        logger.info("Role setup completed", {
          userRole: role,
          roleId,
          discordRoleName,
        });
      } else {
        logger.warn("Failed to setup role", {
          userRole: role,
          discordRoleName,
        });
      }
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
      if (!discordRoleName) {
        logger.error("No Discord role mapping found", { userRole });
        return null;
      }

      const role = this.guild.roles.cache.find(
        (r) => r.name === discordRoleName,
      );

      if (!role) {
        logger.warn("Discord role not found, attempting to create", {
          userRole,
          discordRoleName,
        });

        // Try to create the role if it doesn't exist
        return await this.createRoleIfNotExists(
          discordRoleName,
          this.roleColors[userRole],
        );
      }

      return role.id;
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
        logger.error("Role not found for user role", { userRole, userId });
        return false;
      }

      const member = await this.guild.members.fetch(userId);
      const role = this.guild.roles.cache.get(roleId);

      if (!role) {
        logger.error("Role not found in cache", { roleId, userId });
        return false;
      }

      // Remove all existing DSA roles first
      await this.removeAllDSARoles(userId);

      // Assign new role
      await member.roles.add(role, `Role assignment: ${userRole}`);

      logger.info("Role assigned successfully", {
        userId,
        userRole,
        roleId,
        roleName: role.name,
        memberDisplayName: member.displayName,
      });

      return true;
    } catch (error) {
      logger.error("Error assigning role to user", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        userRole,
        errorCode: (error as any)?.code,
        errorStatus: (error as any)?.status,
      });
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

      if (dsaRoles.size > 0) {
        await member.roles.remove(
          dsaRoles,
          "Role cleanup before new assignment",
        );
        logger.info("DSA roles removed", {
          userId,
          removedRoles: dsaRoles.map((r) => r.name),
          memberDisplayName: member.displayName,
        });
      }
    } catch (error) {
      logger.error("Error removing DSA roles", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        errorCode: (error as any)?.code,
      });
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
        userRole,
        guildId: config.env.discord.guildId,
        guildName: this.guild.name,
      });

      // Get the role ID before adding user
      const roleId = await this.getRoleIdByUserRole(userRole);
      const roles = roleId ? [roleId] : [];

      const addOptions: AddGuildMemberOptions = {
        accessToken: accessToken,
        roles: roles,
      };

      // Add user to guild with initial role
      const member = await this.guild.members.add(userId, addOptions);

      logger.info("User added to Discord guild successfully", {
        userId,
        userRole,
        assignedRoles: roles,
        memberTag: member.user?.tag || "Unknown",
        memberDisplayName: member.displayName,
      });

      // Double-check role assignment
      if (roleId && !roles.length) {
        // Fallback: assign role after adding if initial assignment failed
        await this.assignRoleToUser(userId, userRole);
      }

      return true;
    } catch (error) {
      logger.error("Error adding user to Discord guild", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        userRole,
        errorCode: (error as any)?.code,
        errorStatus: (error as any)?.status,
      });
      return false;
    }
  }

  async removeUserFromGuild(userId: string, reason?: string): Promise<boolean> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return false;
      }

      const member = await this.guild.members.fetch(userId);
      await member.kick(reason || "User removed from guild");

      logger.info("User removed from Discord guild", {
        userId,
        reason,
        memberTag: member.user.tag,
        memberDisplayName: member.displayName,
      });

      return true;
    } catch (error) {
      logger.error("Error removing user from Discord guild", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        errorCode: (error as any)?.code,
      });
      return false;
    }
  }

  async isUserInGuild(userId: string): Promise<boolean> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return false;
      }

      const member = await this.guild.members.fetch(userId);
      return !!member;
    } catch (error) {
      // User not found in guild
      return false;
    }
  }

  async getUserRoleInGuild(userId: string): Promise<UserRole | null> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return null;
      }

      const member = await this.guild.members.fetch(userId);

      // Check which DSA role the user has
      for (const [userRole, discordRoleName] of Object.entries(
        this.roleMapping,
      )) {
        const role = this.guild.roles.cache.find(
          (r) => r.name === discordRoleName,
        );
        if (role && member.roles.cache.has(role.id)) {
          return userRole as UserRole;
        }
      }

      return null;
    } catch (error) {
      logger.error("Error getting user role in guild", { error, userId });
      return null;
    }
  }

  getInviteUrl(): string {
    const inviteUrl =
      config.env.discord.inviteUrl ||
      `https://discord.gg/${config.env.discord.guildId}`;

    logger.info("Generated Discord invite URL", { inviteUrl });
    return inviteUrl;
  }

  async createInviteLink(
    maxAge: number = 86400,
    maxUses: number = 0,
  ): Promise<string | null> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return null;
      }

      // Get the first text channel or system channel
      const channel =
        this.guild.systemChannel ||
        this.guild.channels.cache.filter((c) => c.type === 0).first();

      if (!channel) {
        logger.error("No suitable channel found for invite creation");
        return null;
      }

      const invite = await channel.createInvite({
        maxAge: maxAge,
        maxUses: maxUses,
        unique: true,
        reason: "Auto-generated invite for new user",
      });

      logger.info("Discord invite created", {
        inviteCode: invite.code,
        inviteUrl: invite.url,
        maxAge,
        maxUses,
      });

      return invite.url;
    } catch (error) {
      logger.error("Error creating Discord invite", { error });
      return null;
    }
  }

  // Utility method to check bot permissions
  async checkBotPermissions(): Promise<{
    canManageRoles: boolean;
    canManageMembers: boolean;
    canCreateInvites: boolean;
  }> {
    try {
      if (!this.guild) {
        throw new Error("Guild not initialized");
      }

      const botMember = await this.guild.members.fetch(this.client.user!.id);
      const permissions = botMember.permissions;

      return {
        canManageRoles: permissions.has("ManageRoles"),
        canManageMembers: permissions.has("ManageGuild"),
        canCreateInvites: permissions.has("CreateInstantInvite"),
      };
    } catch (error) {
      logger.error("Error checking bot permissions", { error });
      return {
        canManageRoles: false,
        canManageMembers: false,
        canCreateInvites: false,
      };
    }
  }

  // Get guild statistics
  async getGuildStats(): Promise<{
    memberCount: number;
    roleCount: number;
    dsaRoleStats: Record<UserRole, number>;
  }> {
    try {
      if (!this.guild) {
        throw new Error("Guild not initialized");
      }

      await this.guild.members.fetch(); // Fetch all members

      const dsaRoleStats: Record<UserRole, number> = {
        [UserRole.NEWBIE]: 0,
        [UserRole.MEMBER]: 0,
        [UserRole.CONTRIBUTOR]: 0,
        [UserRole.MODERATOR]: 0,
        [UserRole.ADMIN]: 0,
      };

      // Count members in each DSA role
      for (const [userRole, discordRoleName] of Object.entries(
        this.roleMapping,
      )) {
        const role = this.guild.roles.cache.find(
          (r) => r.name === discordRoleName,
        );
        if (role) {
          dsaRoleStats[userRole as UserRole] = role.members.size;
        }
      }

      return {
        memberCount: this.guild.memberCount,
        roleCount: this.guild.roles.cache.size,
        dsaRoleStats,
      };
    } catch (error) {
      logger.error("Error getting guild stats", { error });
      throw error;
    }
  }

  // New method to apply tag role to user
  async applyTagRoleToUser(
    userId: string,
    tagName: string,
    tagDisplayName: string,
    tagColor: string,
    tagCategory: TagCategory,
  ): Promise<boolean> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return false;
      }

      // Create Discord role name for the tag
      const discordRoleName = `🏷️ ${tagDisplayName}`;

      // Convert hex color to number
      const colorNumber =
        parseInt(tagColor.replace("#", ""), 16) ||
        this.tagCategoryColors[tagCategory];

      // Create role if it doesn't exist
      const roleId = await this.createRoleIfNotExists(
        discordRoleName,
        colorNumber,
        {
          hoist: false,
          mentionable: false,
        },
      );

      if (!roleId) {
        logger.error("Failed to create or find tag role", {
          tagName,
          discordRoleName,
        });
        return false;
      }

      // Assign role to user
      const member = await this.guild.members.fetch(userId);
      const role = this.guild.roles.cache.get(roleId);

      if (!role) {
        logger.error("Role not found in cache after creation", {
          roleId,
          tagName,
        });
        return false;
      }

      // Check if user already has this role
      if (member.roles.cache.has(roleId)) {
        logger.info("User already has tag role", {
          userId,
          tagName,
          roleName: role.name,
        });
        return true;
      }

      // Add role to user
      await member.roles.add(role, `Tag assigned: ${tagName}`);

      logger.info("Tag role assigned successfully", {
        userId,
        tagName,
        roleId,
        roleName: role.name,
        memberDisplayName: member.displayName,
      });

      return true;
    } catch (error) {
      logger.error("Error applying tag role to user", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        tagName,
        errorCode: (error as any)?.code,
        errorStatus: (error as any)?.status,
      });
      return false;
    }
  }

  // New method to remove tag role from user
  async removeTagRoleFromUser(
    userId: string,
    tagName: string,
    tagDisplayName: string,
  ): Promise<boolean> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return false;
      }

      const discordRoleName = `🏷️ ${tagDisplayName}`;

      // Find the role
      const role = this.guild.roles.cache.find(
        (r) => r.name === discordRoleName,
      );

      if (!role) {
        logger.warn("Tag role not found for removal", {
          tagName,
          discordRoleName,
        });
        return true; // Consider it successful if role doesn't exist
      }

      const member = await this.guild.members.fetch(userId);

      // Check if user has this role
      if (!member.roles.cache.has(role.id)) {
        logger.info("User doesn't have tag role to remove", {
          userId,
          tagName,
          roleName: role.name,
        });
        return true;
      }

      // Remove role from user
      await member.roles.remove(role, `Tag removed: ${tagName}`);

      logger.info("Tag role removed successfully", {
        userId,
        tagName,
        roleId: role.id,
        roleName: role.name,
        memberDisplayName: member.displayName,
      });

      return true;
    } catch (error) {
      logger.error("Error removing tag role from user", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        tagName,
        errorCode: (error as any)?.code,
        errorStatus: (error as any)?.status,
      });
      return false;
    }
  }

  // New method to sync all user's tag roles
  async syncUserTagRoles(
    userId: string,
    userTags: Array<{
      name: string;
      display_name: string;
      color: string;
      category: TagCategory;
      is_active: boolean;
    }>,
  ): Promise<boolean> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return false;
      }

      const member = await this.guild.members.fetch(userId);

      // Get all tag roles (roles that start with 🏷️)
      const existingTagRoles = member.roles.cache.filter((role) =>
        role.name.startsWith("🏷️"),
      );

      // Remove all existing tag roles first
      if (existingTagRoles.size > 0) {
        await member.roles.remove(
          existingTagRoles,
          "Tag sync - removing old roles",
        );
        logger.info("Removed existing tag roles", {
          userId,
          removedRoles: existingTagRoles.map((r) => r.name),
        });
      }

      // Add current active tag roles
      const rolesToAdd: Role[] = [];

      for (const tag of userTags.filter((t) => t.is_active)) {
        const discordRoleName = `🏷️ ${tag.display_name}`;
        const colorNumber =
          parseInt(tag.color.replace("#", ""), 16) ||
          this.tagCategoryColors[tag.category];

        const roleId = await this.createRoleIfNotExists(
          discordRoleName,
          colorNumber,
          {
            hoist: false,
            mentionable: false,
          },
        );

        if (roleId) {
          const role = this.guild.roles.cache.get(roleId);
          if (role) {
            rolesToAdd.push(role);
          }
        }
      }

      // Add all new tag roles at once
      if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd, "Tag sync - adding current roles");
        logger.info("Added current tag roles", {
          userId,
          addedRoles: rolesToAdd.map((r) => r.name),
        });
      }

      logger.info("User tag roles synced successfully", {
        userId,
        totalTags: userTags.length,
        activeTags: userTags.filter((t) => t.is_active).length,
        rolesAdded: rolesToAdd.length,
      });

      return true;
    } catch (error) {
      logger.error("Error syncing user tag roles", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        errorCode: (error as any)?.code,
      });
      return false;
    }
  }

  // New method to cleanup unused tag roles
  async cleanupUnusedTagRoles(): Promise<void> {
    try {
      if (!this.guild) {
        logger.error("Guild not initialized");
        return;
      }

      // Get all tag roles (roles that start with 🏷️)
      const tagRoles = this.guild.roles.cache.filter(
        (role) => role.name.startsWith("🏷️") && role.members.size === 0,
      );

      if (tagRoles.size === 0) {
        logger.info("No unused tag roles to cleanup");
        return;
      }

      // Delete empty tag roles
      for (const role of tagRoles.values()) {
        try {
          await role.delete("Cleanup: unused tag role");
          logger.info("Deleted unused tag role", {
            roleName: role.name,
            roleId: role.id,
          });
        } catch (error) {
          logger.warn("Failed to delete unused tag role", {
            roleName: role.name,
            roleId: role.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.info("Tag role cleanup completed", {
        deletedRoles: tagRoles.size,
      });
    } catch (error) {
      logger.error("Error during tag role cleanup", { error });
    }
  }
}

export const discordService = new DiscordService();
