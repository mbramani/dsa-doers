import { EventData, EventFilters } from "../schemas/event.validation";

import { EventType } from "../types/event";
import { GuildScheduledEventEntityType } from "discord.js";
import { ServiceResult } from "../types/service";
import { activityService } from "./activity.service";
import { discordService } from "./discord.service";
import { logger } from "../utils/logger";
import { prisma } from "./database.service";

export class EventService {
  public async createEvent(
    eventData: EventData,
    createdBy: string,
  ): Promise<ServiceResult<EventType>> {
    try {
      // Validate prerequisite roles exist
      if (eventData.prerequisiteRoles.length > 0) {
        const existingRoles = await prisma.role.findMany({
          where: {
            name: { in: eventData.prerequisiteRoles },
            isArchived: false,
          },
        });

        const existingRoleNames = existingRoles.map((r) => r.name);
        const missingRoles = eventData.prerequisiteRoles.filter(
          (name) => !existingRoleNames.includes(name),
        );

        if (missingRoles.length > 0) {
          return {
            success: false,
            error: `Prerequisite roles not found: ${missingRoles.join(", ")}`,
          };
        }
      }

      let discordEventId: string | null = null;
      let discordChannelId: string | null = eventData.discordChannelId || null;

      // Handle Discord channel setup
      if (discordService.isReady()) {
        // Get Discord role IDs for prerequisite roles
        const prerequisiteRoleIds: string[] = [];
        if (eventData.prerequisiteRoles.length > 0) {
          const rolesWithDiscordIds = await prisma.role.findMany({
            where: {
              name: { in: eventData.prerequisiteRoles },
              discordRoleId: { not: null },
            },
            select: { discordRoleId: true },
          });

          prerequisiteRoleIds.push(
            ...(rolesWithDiscordIds
              .map((r) => r.discordRoleId)
              .filter((id) => id !== null) as string[]),
          );
        }

        // If user provided a discordChannelId, update its permissions
        if (eventData.discordChannelId) {
          const permissionResult =
            await discordService.updateChannelPermissions(
              eventData.discordChannelId,
              prerequisiteRoleIds,
              `Updated permissions for event: ${eventData.title}`,
            );

          if (!permissionResult.success) {
            logger.warn(
              `Failed to update channel permissions: ${permissionResult.error}`,
            );
            return {
              success: false,
              error: `Failed to update Discord channel permissions: ${permissionResult.error}`,
            };
          } else {
            logger.info(
              `Successfully updated permissions for Discord channel: ${eventData.discordChannelId}`,
            );
          }
        }
        // If no channel provided but user wants a private channel, create one
        else if (eventData.createPrivateChannel) {
          const channelResult = await discordService.createPrivateChannel(
            `${eventData.title}`,
            eventData.eventType,
            prerequisiteRoleIds,
            `Created for event: ${eventData.title}`,
          );

          if (channelResult.success && channelResult.data) {
            discordChannelId = channelResult.data.id;
            logger.info(
              `Created private Discord ${eventData.eventType} channel for event: ${channelResult.data.id}`,
            );
          } else {
            logger.warn(
              `Failed to create Discord ${eventData.eventType} channel: ${channelResult.error}`,
            );
            return {
              success: false,
              error: `Failed to create Discord channel: ${channelResult.error}`,
            };
          }
        }
      }
      // Create Discord scheduled event if requested
      if (eventData.createDiscordEvent && discordService.isReady()) {
        const endTime = eventData.duration
          ? new Date(
              eventData.scheduledAt.getTime() + eventData.duration * 60000,
            )
          : new Date(eventData.scheduledAt.getTime() + 60 * 60000); // Default 1 hour

        // Determine expected Discord channel type and corresponding event entity
        const isStageEvent = eventData.eventType === "stage";
        const expectedChannelType = isStageEvent
          ? "GUILD_STAGE_VOICE"
          : "GUILD_VOICE";
        let entityType: keyof typeof GuildScheduledEventEntityType;
        let useChannelId: string | undefined = discordChannelId || undefined;

        if (discordChannelId) {
          const channelInfo =
            await discordService.getChannelInfo(discordChannelId);
          if (
            channelInfo.success &&
            channelInfo.data?.type === expectedChannelType
          ) {
            entityType = isStageEvent ? "StageInstance" : "Voice";
          } else {
            logger.warn(
              `Channel ${discordChannelId} is not a ${expectedChannelType}, creating external event`,
            );
            entityType = "External";
            useChannelId = undefined;
          }
        } else {
          entityType = "External";
        }

        const discordEventResult = await discordService.createScheduledEvent({
          name: eventData.title,
          description:
            `${eventData.description}\n\n` +
            `Difficulty: ${eventData.difficultyLevel || "Not specified"}\n` +
            (eventData.prerequisiteRoles.length > 0
              ? `Required roles: ${eventData.prerequisiteRoles.join(", ")}`
              : "Open to all members") +
            (useChannelId
              ? ""
              : "\n\nJoin details will be provided before the event."),
          scheduledStartTime: eventData.scheduledAt,
          scheduledEndTime: endTime,
          channelId: useChannelId,
          entityType,
          privacyLevel: "GuildOnly",
          reason: `Created for platform event: ${eventData.title}`,
        });

        if (discordEventResult.success && discordEventResult.data) {
          discordEventId = discordEventResult.data.id;
          logger.info(
            `Created Discord scheduled event: ${discordEventId} (type: ${entityType})`,
          );
        } else {
          logger.warn(
            `Failed to create Discord event: ${discordEventResult.error}`,
          );
        }
      }

      // Create event in database
      const newEvent = await prisma.event.create({
        data: {
          title: eventData.title,
          description: eventData.description,
          eventType: eventData.eventType,
          difficultyLevel: eventData.difficultyLevel,
          scheduledAt: eventData.scheduledAt,
          duration: eventData.duration,
          capacity: eventData.capacity,
          prerequisiteRoles: eventData.prerequisiteRoles,
          discordChannelId,
          discordEventId,
          createdBy,
        },
        include: {
          creator: {
            select: {
              id: true,
              discordUsername: true,
              discordAvatar: true,
            },
          },
        },
      });

      // Log event creation
      await activityService.logActivity({
        actorId: createdBy,
        actorType: "USER",
        actionType: "EVENT_CREATED",
        entityType: "EVENT",
        entityId: newEvent.id,
        details: {
          title: eventData.title,
          eventType: eventData.eventType,
          difficultyLevel: eventData.difficultyLevel,
          scheduledAt: eventData.scheduledAt,
          prerequisiteRoles: eventData.prerequisiteRoles,
          discordEventId,
          discordChannelId,
          discordEventCreated: !!discordEventId,
          discordChannelCreated:
            !eventData.discordChannelId && !!discordChannelId, // Only true if we created a new channel
          discordChannelUpdated: !!eventData.discordChannelId, // True if we updated existing channel permissions
          channelType: eventData.eventType,
          providedChannelId: !!eventData.discordChannelId,
        },
      });

      return {
        success: true,
        data: newEvent,
      };
    } catch (error) {
      logger.error("Failed to create event:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create event",
      };
    }
  }

  public async updateEvent(
    eventId: string,
    updateData: Partial<EventData>,
    updatedBy: string,
  ): Promise<ServiceResult<EventType>> {
    try {
      // Check if event exists
      const existingEvent = await prisma.event.findUnique({
        where: { id: eventId, isArchived: false },
      });

      if (!existingEvent) {
        return {
          success: false,
          error: "Event not found",
        };
      }

      // Validate status transition if status is being updated
      if (updateData.status && updateData.status !== existingEvent.status) {
        const validTransition = this.isValidStatusTransition(
          existingEvent.status,
          updateData.status
        );
        
        if (!validTransition.valid) {
          return {
            success: false,
            error: validTransition.error,
          };
        }
      }

      // Validate prerequisite roles if being updated
      if (updateData.prerequisiteRoles && updateData.prerequisiteRoles.length > 0) {
        const existingRoles = await prisma.role.findMany({
          where: {
            name: { in: updateData.prerequisiteRoles },
            isArchived: false,
          },
        });

        const existingRoleNames = existingRoles.map((r) => r.name);
        const missingRoles = updateData.prerequisiteRoles.filter(
          (name) => !existingRoleNames.includes(name),
        );

        if (missingRoles.length > 0) {
          return {
            success: false,
            error: `Prerequisite roles not found: ${missingRoles.join(", ")}`,
          };
        }
      }

      // Update Discord scheduled event if it exists
      if (existingEvent.discordEventId && discordService.isReady()) {
        const discordUpdateData: any = {};

        if (updateData.title) discordUpdateData.name = updateData.title;

        if (updateData.description) {
          discordUpdateData.description =
            `${updateData.description}\n\n` +
            `Difficulty: ${updateData.difficultyLevel || existingEvent.difficultyLevel || "Not specified"}\n` +
            ((updateData.prerequisiteRoles || existingEvent.prerequisiteRoles).length > 0
              ? `Required roles: ${(updateData.prerequisiteRoles || existingEvent.prerequisiteRoles).join(", ")}`
              : "Open to all members");
        }

        if (updateData.scheduledAt)
          discordUpdateData.scheduledStartTime = updateData.scheduledAt;

        // Handle status update for Discord
        if (updateData.status) {
          const discordStatusMap: Record<string, "Active" | "Completed" | "Canceled"> = {
            active: "Active",
            completed: "Completed",
            cancelled: "Canceled",
          };

          const discordStatus = discordStatusMap[updateData.status];
          if (discordStatus) {
            discordUpdateData.status = discordStatus;
          }
        }

        if (Object.keys(discordUpdateData).length > 0) {
          const discordUpdateResult = await discordService.updateScheduledEvent(
            existingEvent.discordEventId,
            discordUpdateData,
            `Updated by ${updatedBy} via DSA Doers platform`,
          );

          if (!discordUpdateResult.success) {
            logger.warn(`Failed to update Discord event: ${discordUpdateResult.error}`);
          }
        }
      }

      // Update channel permissions if prerequisite roles changed
      if (updateData.prerequisiteRoles && existingEvent.discordChannelId && discordService.isReady()) {
        // Get Discord role IDs for new prerequisite roles
        const prerequisiteRoleIds: string[] = [];
        if (updateData.prerequisiteRoles.length > 0) {
          const rolesWithDiscordIds = await prisma.role.findMany({
            where: {
              name: { in: updateData.prerequisiteRoles },
              discordRoleId: { not: null },
            },
            select: { discordRoleId: true },
          });

          prerequisiteRoleIds.push(
            ...(rolesWithDiscordIds
              .map((r) => r.discordRoleId)
              .filter((id) => id !== null) as string[]),
          );
        }

        const permissionResult = await discordService.updateChannelPermissions(
          existingEvent.discordChannelId,
          prerequisiteRoleIds,
          `Updated permissions for event: ${existingEvent.title}`,
        );

        if (!permissionResult.success) {
          logger.warn(`Failed to update channel permissions: ${permissionResult.error}`);
        }
      }

      // Update event in database
      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: {
          title: updateData.title,
          description: updateData.description,
          eventType: updateData.eventType,
          difficultyLevel: updateData.difficultyLevel,
          status: updateData.status,
          scheduledAt: updateData.scheduledAt,
          duration: updateData.duration,
          capacity: updateData.capacity,
          prerequisiteRoles: updateData.prerequisiteRoles,
          discordChannelId: updateData.discordChannelId,
        },
        include: {
          creator: {
            select: {
              id: true,
              discordUsername: true,
              discordAvatar: true,
            },
          },
        },
      });

      // Log event update with status change details
      await activityService.logActivity({
        actorId: updatedBy,
        actorType: "USER",
        actionType: updateData.status ? "EVENT_STATUS_UPDATED" : "EVENT_UPDATED",
        entityType: "EVENT",
        entityId: eventId,
        details: {
          oldData: existingEvent,
          newData: updateData,
          title: updatedEvent.title,
          oldStatus: existingEvent.status,
          newStatus: updateData.status,
          statusChanged: !!updateData.status,
        },
      });

      logger.info('Event updated successfully', {
        eventId,
        updatedFields: Object.keys(updateData),
        statusChanged: updateData.status ? `${existingEvent.status} -> ${updateData.status}` : false,
        updatedBy,
      });

      return {
        success: true,
        data: updatedEvent,
      };
    } catch (error) {
      logger.error("Failed to update event:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update event",
      };
    }
  }

  public async deleteEvent(
    eventId: string,
    reason: string,
    deletedBy: string,
  ): Promise<ServiceResult<boolean>> {
    try {
      // Check if event exists
      const existingEvent = await prisma.event.findUnique({
        where: { id: eventId, isArchived: false },
      });

      if (!existingEvent) {
        return {
          success: false,
          error: "Event not found",
        };
      }

      // Delete Discord scheduled event if exists
      if (existingEvent.discordEventId && discordService.isReady()) {
        const discordDeleteResult = await discordService.deleteScheduledEvent(
          existingEvent.discordEventId,
          `Deleted by ${deletedBy}: ${reason}`,
        );

        if (!discordDeleteResult.success) {
          logger.warn(
            `Failed to delete Discord event: ${discordDeleteResult.error}`,
          );
        }
      }

      // Soft delete the event (archive)
      await prisma.event.update({
        where: { id: eventId },
        data: {
          isArchived: true,
        },
      });

      // Log event deletion
      await activityService.logActivity({
        actorId: deletedBy,
        actorType: "USER",
        actionType: "EVENT_DELETED",
        entityType: "EVENT",
        entityId: eventId,
        details: {
          title: existingEvent.title,
          reason,
          discordEventId: existingEvent.discordEventId,
          discordChannelId: existingEvent.discordChannelId,
        },
      });

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      logger.error("Failed to delete event:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete event",
      };
    }
  }

public async getEvents(
    filters: EventFilters,
  ): Promise<ServiceResult<{ events: EventType[]; total: number }>> {
    try {
      const where: any = {
        isArchived: false,
      };

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      if (filters.eventType) {
        where.eventType = filters.eventType;
      }

      if (filters.difficultyLevel) {
        where.difficultyLevel = filters.difficultyLevel;
      }

      // Add status filter
      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.upcoming) {
        where.scheduledAt = { gte: new Date() };
      }

      const [events, total] = await Promise.all([
        prisma.event.findMany({
          where,
          include: {
            creator: {
              select: {
                id: true,
                discordUsername: true,
                discordAvatar: true,
              },
            },
          },
          orderBy: {
            [filters.sortBy]: filters.sortOrder,
          },
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit,
        }),
        prisma.event.count({ where }),
      ]);

      return {
        success: true,
        data: { events, total },
      };
    } catch (error) {
      logger.error("Failed to get events:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to retrieve events",
      };
    }
  }

  public async getEventById(
    eventId: string,
  ): Promise<ServiceResult<EventType>> {
    try {
      const event = await prisma.event.findUnique({
        where: {
          id: eventId,
          isArchived: false,
        },
        include: {
          creator: {
            select: {
              id: true,
              discordUsername: true,
              discordAvatar: true,
            },
          },
        },
      });

      if (!event) {
        return {
          success: false,
          error: "Event not found",
        };
      }

      return {
        success: true,
        data: event,
      };
    } catch (error) {
      logger.error("Failed to get event by ID:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to retrieve event",
      };
    }
  }
  private isValidStatusTransition(
    currentStatus: string,
    newStatus: string
  ): { valid: boolean; error?: string } {
    const validTransitions: Record<string, string[]> = {
      scheduled: ["active", "cancelled"],
      active: ["completed", "cancelled"],
      completed: [], // Cannot transition from completed
      cancelled: ["scheduled"], // Can reschedule cancelled events
    };

    if (currentStatus === newStatus) {
      return { valid: false, error: "Status is already set to this value" };
    }

    const allowedTransitions = validTransitions[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return {
        valid: false,
        error: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(", ") || "none"}`,
      };
    }

    return { valid: true };
  }
}

export const eventService = new EventService();
