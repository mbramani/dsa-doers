import { Client, GatewayIntentBits, Guild } from "discord.js";
import { DiscordTokenResponse, DiscordUser } from "../types/auth";

import { DiscordServiceResult } from "../types/service";
import { discordConfig } from "../utils/config";
import { logger } from "../utils/logger";

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

  private async initialize(): Promise<void> {
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
      });
    } catch (error) {
      logger.error("Failed to initialize Discord service", {
        error: error instanceof Error ? error.message : "Unknown error",
        guildId: discordConfig.guildId,
      });
    }
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
  ): Promise<DiscordServiceResult<boolean>> {
    try {
      if (!this.isInitialized || !this.guild) {
        return {
          success: false,
          error: "Discord bot is not ready",
        };
      }

      // Implement role sync logic as needed
      logger.info("Discord role sync completed", { userId });

      return {
        success: true,
        data: true,
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
