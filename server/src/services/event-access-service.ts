import {
  EventEntity,
  EventStatus,
  EventVoiceAccessEntity,
  ParticipantStatus,
  UserEventEligibilityQuery,
  VoiceAccessStatus,
} from "@/types/database";

import { DiscordChannelService } from "./discord-channel-service";
import { EventRepository } from "@/database";
import config from "@/utils/config";
import { createLogger } from "@/utils/logger";

const logger = createLogger("event-access-service");

export interface EventAccessResult {
  success: boolean;
  message: string;
  data?: {
    hasAccess?: boolean;
    voiceChannelId?: string;
    eventTitle?: string;
    missingTags?: Array<{
      tag_id: string;
      name: string;
      display_name: string;
      color: string;
      icon: string;
    }>;
  };
  error?: {
    code: string;
    details?: any;
  };
}

export interface EventEligibilityResult {
  isEligible: boolean;
  hasAllRequiredTags: boolean;
  missingTags: Array<{
    tag_id: string;
    name: string;
    display_name: string;
    color: string;
    icon: string;
  }>;
  userTags: Array<{
    tag_id: string;
    name: string;
    display_name: string;
    color: string;
    icon: string;
    is_primary: boolean;
  }>;
}

export class EventAccessService {
  constructor(
    private eventRepo: EventRepository,
    private discordService: DiscordChannelService,
  ) {}

  /**
   * Main method to request access to an event's voice channel
   */
  async requestEventAccess(
    eventId: string,
    userId: string,
  ): Promise<EventAccessResult> {
    const operationId = `${eventId}-${userId}-${Date.now()}`;
    logger.info("Starting event access request", {
      eventId,
      userId,
      operationId,
    });

    try {
      // 1. Validate event exists and is active
      const event = await this.eventRepo.getEventById(eventId);
      if (!event) {
        return {
          success: false,
          message: "Event not found",
          error: { code: "EVENT_NOT_FOUND" },
        };
      }

      if (event.status !== EventStatus.ACTIVE) {
        return {
          success: false,
          message: `Event is ${event.status.toLowerCase()}. Only active events allow access requests.`,
          error: {
            code: "EVENT_NOT_ACTIVE",
            details: { currentStatus: event.status },
          },
        };
      }

      // Check if event has started (optional grace period)
      const now = new Date();
      const eventStartTime = new Date(event.start_time);
      const gracePeriodMinutes = 30; // Allow joining 30 minutes before start
      const graceStartTime = new Date(
        eventStartTime.getTime() - gracePeriodMinutes * 60 * 1000,
      );

      if (now < graceStartTime) {
        const timeUntilAccess = Math.ceil(
          (graceStartTime.getTime() - now.getTime()) / (1000 * 60),
        );
        return {
          success: false,
          message: `Event access will be available ${timeUntilAccess} minutes before the event starts.`,
          error: {
            code: "EVENT_TOO_EARLY",
            details: {
              eventStartTime: event.start_time,
              graceStartTime,
              minutesUntilAccess: timeUntilAccess,
            },
          },
        };
      }

      // 2. Check if user already has access
      const existingAccess = await this.eventRepo.getUserEventAccess(
        eventId,
        userId,
      );
      if (existingAccess?.status === VoiceAccessStatus.ACTIVE) {
        return {
          success: true,
          message: "You already have access to this event",
          data: {
            hasAccess: true,
            voiceChannelId: event.voice_channel_id,
            eventTitle: event.title,
          },
        };
      }

      // 3. Get user's Discord profile and verify it exists
      const userDiscord = await this.eventRepo.getUserDiscordProfile(userId);
      if (!userDiscord?.discord_id) {
        return {
          success: false,
          message:
            "You must link your Discord account to join voice events. Please connect your Discord account in your profile settings.",
          error: { code: "DISCORD_NOT_LINKED" },
        };
      }

      // 4. Check if user has ALL required tags for the event
      const eligibility = await this.eventRepo.checkUserEligibility(
        eventId,
        userId,
      );
      if (!eligibility.is_eligible || !eligibility.has_all_required_tags) {
        const missingTagsText = eligibility.missing_required_tags
          .map((tag: any) => tag.display_name)
          .join(", ");

        return {
          success: false,
          message: `You're missing required tags to join this event: ${missingTagsText}. Earn these tags to gain access.`,
          data: {
            missingTags: eligibility.missing_required_tags,
          },
          error: {
            code: "MISSING_REQUIRED_TAGS",
            details: {
              missingTags: eligibility.missing_required_tags,
              userTags: eligibility.user_tags,
            },
          },
        };
      }

      // 5. Check max participants limit
      if (event.max_participants) {
        const currentAccessCount = event.voice_access_count || 0;
        if (currentAccessCount >= event.max_participants) {
          return {
            success: false,
            message: `Event is full. Maximum ${event.max_participants} participants allowed.`,
            error: {
              code: "EVENT_FULL",
              details: {
                maxParticipants: event.max_participants,
                currentCount: currentAccessCount,
              },
            },
          };
        }
      }

      // 6. Grant Discord voice channel access
      const discordSuccess = await this.discordService.grantVoiceChannelAccess(
        config.env.discord.guildId,
        event.voice_channel_id,
        userDiscord.discord_id,
        event.event_role_id || undefined,
      );

      if (!discordSuccess) {
        logger.error("Failed to grant Discord voice channel access", {
          eventId,
          userId,
          discordUserId: userDiscord.discord_id,
          voiceChannelId: event.voice_channel_id,
          operationId,
        });

        return {
          success: false,
          message:
            "Unable to grant Discord voice channel access. Please try again or contact support.",
          error: {
            code: "DISCORD_ACCESS_FAILED",
            details: {
              discordUserId: userDiscord.discord_id,
              voiceChannelId: event.voice_channel_id,
            },
          },
        };
      }

      // 7. Record access in database
      try {
        await this.eventRepo.grantEventAccess(
          eventId,
          userId,
          userDiscord.discord_id,
        );

        // Also add as participant if not already there
        await this.eventRepo.addParticipant(
          eventId,
          userId,
          ParticipantStatus.GRANTED,
        );

        logger.info("Event access granted successfully", {
          eventId,
          userId,
          eventTitle: event.title,
          voiceChannelId: event.voice_channel_id,
          operationId,
        });

        return {
          success: true,
          message: `Access granted! You can now join the voice channel for "${event.title}".`,
          data: {
            hasAccess: true,
            voiceChannelId: event.voice_channel_id,
            eventTitle: event.title,
          },
        };
      } catch (dbError) {
        // If database recording fails, revoke Discord access to maintain consistency
        logger.error("Database recording failed, revoking Discord access", {
          eventId,
          userId,
          dbError,
          operationId,
        });

        await this.discordService.revokeVoiceChannelAccess(
          config.env.discord.guildId,
          event.voice_channel_id,
          userDiscord.discord_id,
          event.event_role_id || undefined,
        );

        return {
          success: false,
          message: "Failed to record access in database. Please try again.",
          error: {
            code: "DATABASE_ERROR",
            details: { error: dbError },
          },
        };
      }
    } catch (error: any) {
      logger.error("Unexpected error during event access request", {
        error,
        eventId,
        userId,
        operationId,
      });

      return {
        success: false,
        message: "An unexpected error occurred. Please try again.",
        error: {
          code: "INTERNAL_ERROR",
          details: { error: error?.message },
        },
      };
    }
  }

  /**
   * Revoke user's access to event voice channel
   */
  async revokeEventAccess(
    eventId: string,
    userId: string,
    reason: string = "user_requested",
  ): Promise<EventAccessResult> {
    const operationId = `revoke-${eventId}-${userId}-${Date.now()}`;
    logger.info("Starting event access revocation", {
      eventId,
      userId,
      reason,
      operationId,
    });

    try {
      const event = await this.eventRepo.getEventById(eventId);
      if (!event) {
        return {
          success: false,
          message: "Event not found",
          error: { code: "EVENT_NOT_FOUND" },
        };
      }

      const userAccess = await this.eventRepo.getUserEventAccess(
        eventId,
        userId,
      );
      if (!userAccess || userAccess.status !== VoiceAccessStatus.ACTIVE) {
        return {
          success: true,
          message: "You do not have active access to this event",
          data: { hasAccess: false },
        };
      }

      // Revoke Discord permissions
      const discordSuccess = await this.discordService.revokeVoiceChannelAccess(
        config.env.discord.guildId,
        event.voice_channel_id,
        userAccess.discord_user_id,
        event.event_role_id || undefined,
      );

      // Disconnect user if they're currently in the voice channel
      if (reason === "admin_revoked" || reason === "event_ended") {
        await this.discordService.disconnectUserFromVoice(
          userAccess.discord_user_id,
          `Access revoked: ${reason}`,
        );
      }

      // Update database record
      await this.eventRepo.revokeEventAccess(eventId, userId, reason);

      logger.info("Event access revoked successfully", {
        eventId,
        userId,
        reason,
        discordSuccess,
        operationId,
      });

      return {
        success: true,
        message: "Access revoked successfully",
        data: { hasAccess: false },
      };
    } catch (error: any) {
      logger.error("Failed to revoke event access", {
        error,
        eventId,
        userId,
        reason,
        operationId,
      });

      return {
        success: false,
        message: "Failed to revoke access. Please try again.",
        error: {
          code: "REVOKE_FAILED",
          details: { error: error?.message },
        },
      };
    }
  }

  /**
   * Cleanup event - revoke all access and delete temp role when event ends
   */
  async cleanupEvent(
    eventId: string,
    reason: string = "event_ended",
  ): Promise<{
    success: boolean;
    message: string;
    stats: {
      usersRevoked: number;
      discordRoleDeleted: boolean;
      errors: number;
    };
  }> {
    const operationId = `cleanup-${eventId}-${Date.now()}`;
    logger.info("Starting event cleanup", { eventId, reason, operationId });

    try {
      const event = await this.eventRepo.getEventById(eventId);
      if (!event) {
        return {
          success: false,
          message: "Event not found",
          stats: { usersRevoked: 0, discordRoleDeleted: false, errors: 1 },
        };
      }

      // Get all users with active access
      const activeAccess = await this.eventRepo.getEventActiveAccess(eventId);
      let usersRevoked = 0;
      let errors = 0;

      // Revoke access for all users
      for (const access of activeAccess) {
        try {
          const discordSuccess =
            await this.discordService.revokeVoiceChannelAccess(
              config.env.discord.guildId,
              event.voice_channel_id,
              access.discord_user_id,
              event.event_role_id || undefined,
            );

          // Disconnect user from voice channel
          await this.discordService.disconnectUserFromVoice(
            access.discord_user_id,
            `Event ended: ${event.title}`,
          );

          if (discordSuccess) {
            usersRevoked++;
          }
        } catch (userError) {
          logger.error("Failed to revoke access for user during cleanup", {
            eventId,
            userId: access.user_id,
            discordUserId: access.discord_user_id,
            error: userError,
            operationId,
          });
          errors++;
        }
      }

      // Delete temporary role if it exists
      let discordRoleDeleted = false;
      if (event.event_role_id) {
        try {
          discordRoleDeleted = await this.discordService.deleteEventRole(
            config.env.discord.guildId,
            event.event_role_id,
          );
        } catch (roleError) {
          logger.error("Failed to delete event role during cleanup", {
            eventId,
            roleId: event.event_role_id,
            error: roleError,
            operationId,
          });
          errors++;
        }
      }

      // Update database - revoke all access and update event status
      const dbUsersRevoked = await this.eventRepo.revokeAllEventAccess(
        eventId,
        reason,
      );
      await this.eventRepo.updateEventStatus(eventId, EventStatus.COMPLETED);

      logger.info("Event cleanup completed", {
        eventId,
        eventTitle: event.title,
        usersRevoked,
        dbUsersRevoked,
        discordRoleDeleted,
        errors,
        reason,
        operationId,
      });

      return {
        success: errors === 0,
        message: `Event cleanup completed. ${usersRevoked} users revoked, role deleted: ${discordRoleDeleted}`,
        stats: {
          usersRevoked: Math.max(usersRevoked, dbUsersRevoked),
          discordRoleDeleted,
          errors,
        },
      };
    } catch (error) {
      logger.error("Failed to cleanup event", {
        error,
        eventId,
        reason,
        operationId,
      });

      return {
        success: false,
        message: "Failed to cleanup event",
        stats: { usersRevoked: 0, discordRoleDeleted: false, errors: 1 },
      };
    }
  }

  /**
   * Check event eligibility without granting access
   */
  async checkEventEligibility(
    eventId: string,
    userId: string,
  ): Promise<EventEligibilityResult> {
    try {
      const eligibility = await this.eventRepo.checkUserEligibility(
        eventId,
        userId,
      );

      return {
        isEligible: eligibility.is_eligible,
        hasAllRequiredTags: eligibility.has_all_required_tags,
        missingTags: eligibility.missing_required_tags,
        userTags: eligibility.user_tags,
      };
    } catch (error) {
      logger.error("Failed to check event eligibility", {
        error,
        eventId,
        userId,
      });

      return {
        isEligible: false,
        hasAllRequiredTags: false,
        missingTags: [],
        userTags: [],
      };
    }
  }

  /**
   * Get current access status for user
   */
  async getUserAccessStatus(
    eventId: string,
    userId: string,
  ): Promise<{
    hasAccess: boolean;
    accessDetails: EventVoiceAccessEntity | null;
    eligibility: EventEligibilityResult;
  }> {
    try {
      const [accessDetails, eligibility] = await Promise.all([
        this.eventRepo.getUserEventAccess(eventId, userId),
        this.checkEventEligibility(eventId, userId),
      ]);

      return {
        hasAccess: accessDetails?.status === VoiceAccessStatus.ACTIVE,
        accessDetails,
        eligibility,
      };
    } catch (error) {
      logger.error("Failed to get user access status", {
        error,
        eventId,
        userId,
      });

      return {
        hasAccess: false,
        accessDetails: null,
        eligibility: {
          isEligible: false,
          hasAllRequiredTags: false,
          missingTags: [],
          userTags: [],
        },
      };
    }
  }

  /**
   * Admin method to manually grant access (bypasses tag requirements)
   */
  async adminGrantAccess(
    eventId: string,
    userId: string,
    adminUserId: string,
  ): Promise<EventAccessResult> {
    logger.info("Admin granting event access", {
      eventId,
      userId,
      adminUserId,
    });

    try {
      const event = await this.eventRepo.getEventById(eventId);
      if (!event) {
        return {
          success: false,
          message: "Event not found",
          error: { code: "EVENT_NOT_FOUND" },
        };
      }

      const userDiscord = await this.eventRepo.getUserDiscordProfile(userId);
      if (!userDiscord?.discord_id) {
        return {
          success: false,
          message: "User must have a linked Discord account",
          error: { code: "DISCORD_NOT_LINKED" },
        };
      }

      // Grant Discord access
      const discordSuccess = await this.discordService.grantVoiceChannelAccess(
        config.env.discord.guildId,
        event.voice_channel_id,
        userDiscord.discord_id,
        event.event_role_id || undefined,
      );

      if (!discordSuccess) {
        return {
          success: false,
          message: "Failed to grant Discord access",
          error: { code: "DISCORD_ACCESS_FAILED" },
        };
      }

      // Record in database
      await this.eventRepo.grantEventAccess(
        eventId,
        userId,
        userDiscord.discord_id,
      );
      await this.eventRepo.addParticipant(
        eventId,
        userId,
        ParticipantStatus.GRANTED,
      );

      logger.info("Admin access grant successful", {
        eventId,
        userId,
        adminUserId,
      });

      return {
        success: true,
        message: "Access granted by admin",
        data: {
          hasAccess: true,
          voiceChannelId: event.voice_channel_id,
          eventTitle: event.title,
        },
      };
    } catch (error: any) {
      logger.error("Admin access grant failed", {
        error,
        eventId,
        userId,
        adminUserId,
      });

      return {
        success: false,
        message: "Failed to grant admin access",
        error: {
          code: "ADMIN_GRANT_FAILED",
          details: { error: error?.message },
        },
      };
    }
  }
}

// Export singleton instance
export const eventAccessService = new EventAccessService(
  new EventRepository(),
  new DiscordChannelService(),
);
