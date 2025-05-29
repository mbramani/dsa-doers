import { ApiResponse, PaginatedResponse, UserRole } from "@/types/api";
import { AuthRequest, authenticateToken, requireRole } from "@/middleware/auth";
import {
  CreateEventInput,
  EventEntity,
  EventFilters,
  EventListQuery,
  EventPaginationQuery,
  EventStatus,
  EventType,
  EventWithDetailsQuery,
  UpdateEventInput,
} from "@/types/database";
import { Request, Response } from "express";

import { Router } from "express";
import { createLogger } from "@/utils/logger";
import { discordChannelService } from "@/services/discord-channel-service";
import { eventAccessService } from "@/services/event-access-service";
import { eventRepository } from "@/database";
import { rateLimit } from "express-rate-limit";

const router = Router();
const logger = createLogger("events");

// Rate limiting for access requests
const accessRequestRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each user to 10 access requests per windowMs
  message: {
    status: "error",
    message: "Too many access requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation schemas (using simple validation for MVP)
const validateCreateEvent = (
  body: any,
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (
    !body.title ||
    typeof body.title !== "string" ||
    body.title.trim().length < 3
  ) {
    errors.title = "Title must be at least 3 characters";
  }

  if (body.title && body.title.length > 255) {
    errors.title = "Title must be less than 255 characters";
  }

  if (!body.event_type || !Object.values(EventType).includes(body.event_type)) {
    errors.event_type = "Valid event type is required";
  }

  if (!body.start_time || isNaN(Date.parse(body.start_time))) {
    errors.start_time = "Valid start time is required";
  }

  if (body.end_time && isNaN(Date.parse(body.end_time))) {
    errors.end_time = "Valid end time is required";
  }

  if (!body.voice_channel_id || typeof body.voice_channel_id !== "string") {
    errors.voice_channel_id = "Voice channel ID is required";
  }

  if (
    body.max_participants &&
    (!Number.isInteger(body.max_participants) || body.max_participants < 1)
  ) {
    errors.max_participants = "Max participants must be a positive integer";
  }

  if (!Array.isArray(body.required_tag_ids)) {
    errors.required_tag_ids = "Required tag IDs must be an array";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

const validateUpdateEvent = (
  body: any,
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (
    body.title !== undefined &&
    (typeof body.title !== "string" || body.title.trim().length < 3)
  ) {
    errors.title = "Title must be at least 3 characters";
  }

  if (
    body.event_type !== undefined &&
    !Object.values(EventType).includes(body.event_type)
  ) {
    errors.event_type = "Valid event type is required";
  }

  if (body.start_time !== undefined && isNaN(Date.parse(body.start_time))) {
    errors.start_time = "Valid start time is required";
  }

  if (body.end_time !== undefined && isNaN(Date.parse(body.end_time))) {
    errors.end_time = "Valid end time is required";
  }

  if (
    body.max_participants !== undefined &&
    (!Number.isInteger(body.max_participants) || body.max_participants < 1)
  ) {
    errors.max_participants = "Max participants must be a positive integer";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// ==================== Admin/Moderator Routes ====================

// POST /api/events - Create new event (admin/moderator only)
router.post(
  "/",
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.MODERATOR]),
  async (req: AuthRequest, res: Response) => {
    try {
      const validation = validateCreateEvent(req.body);
      if (!validation.isValid) {
        const response: ApiResponse = {
          status: "error",
          message: "Validation failed",
          errors: validation.errors,
        };
        return res.status(400).json(response);
      }

      const requiredTagIds: string[] = req.body.required_tag_ids || [];

      const eventData: CreateEventInput = {
        title: req.body.title.trim(),
        description: req.body.description?.trim() || undefined,
        event_type: req.body.event_type,
        start_time: new Date(req.body.start_time),
        end_time: req.body.end_time ? new Date(req.body.end_time) : undefined,
        voice_channel_id: req.body.voice_channel_id,
        max_participants: req.body.max_participants || undefined,
        required_tag_ids: requiredTagIds,
        created_by: req.user!.userId,
      };

      // Validate that voice channel exists
      const voiceChannels = await discordChannelService.getVoiceChannels();
      const channelExists = voiceChannels.some(
        (channel) => channel.id === eventData.voice_channel_id,
      );

      if (!channelExists) {
        const response: ApiResponse = {
          status: "error",
          message: "Invalid voice channel ID",
          errors: { voice_channel_id: "Voice channel does not exist" },
        };
        return res.status(400).json(response);
      }

      // Validate required tags exist
      if (requiredTagIds.length > 0) {
        const tags = await eventRepository.getTagsByIds(requiredTagIds);
        if (tags.length !== requiredTagIds.length) {
          const response: ApiResponse = {
            status: "error",
            message: "Some required tags do not exist",
            errors: { required_tag_ids: "Invalid tag IDs provided" },
          };
          return res.status(400).json(response);
        }
      }

      const event = await eventRepository.createEvent(
        eventData,
        requiredTagIds,
      );

      logger.info("Event created successfully", {
        eventId: event.id,
        title: event.title,
        createdBy: req.user!.userId,
        requiredTagsCount: requiredTagIds.length,
      });

      const response: ApiResponse<EventEntity> = {
        status: "success",
        message: "Event created successfully",
        data: event,
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error("Failed to create event", {
        error,
        userId: req.user?.userId,
      });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to create event",
      };

      res.status(500).json(response);
    }
  },
);

// GET /api/events/public - Get public events (no auth required)
router.get("/public", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 12, 50);

    const filters: EventFilters = {
      // Only show active events publicly
    };

    // Add search filter if provided
    if (req.query.search && typeof req.query.search === "string") {
      filters.search = req.query.search.trim();
    }

    // Add event type filter if provided
    if (req.query.event_type && typeof req.query.event_type === "string") {
      filters.event_type = req.query.event_type as EventType;
    }

    const pagination: EventPaginationQuery = {
      page,
      limit,
      sort_by: "start_time",
      sort_order: "asc",
    };

    const result = await eventRepository.getEvents(filters, pagination);

    const response: ApiResponse<PaginatedResponse<EventListQuery>> = {
      status: "success",
      message: "Public events fetched successfully",
      data: {
        data: result.events,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNext: page < Math.ceil(result.total / limit),
          hasPrev: page > 1,
        },
      },
    };

    res.json(response);
  } catch (error) {
    logger.error("Failed to fetch public events", { error });

    const response: ApiResponse = {
      status: "error",
      message: "Failed to fetch events",
    };

    res.status(500).json(response);
  }
});

// GET /api/events - List events with filters
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as EventStatus;
    const event_type = req.query.event_type as EventType;
    const start_date = req.query.start_date
      ? new Date(req.query.start_date as string)
      : undefined;
    const end_date = req.query.end_date
      ? new Date(req.query.end_date as string)
      : undefined;
    const sort_by = req.query.sort_by as
      | "start_time"
      | "created_at"
      | "title"
      | "participant_count";
    const sort_order = req.query.sort_order as "asc" | "desc";

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      const errors: Record<string, string> = {};
      if (page < 1) errors.page = "Page must be >= 1";
      if (limit < 1 || limit > 100)
        errors.limit = "Limit must be between 1 and 100";

      const response: ApiResponse = {
        status: "error",
        message: "Invalid pagination parameters",
        errors,
      };
      return res.status(400).json(response);
    }

    const filters: EventFilters = {
      search,
      status,
      event_type,
      start_date,
      end_date,
    };

    const pagination: EventPaginationQuery = {
      page,
      limit,
      sort_by: sort_by || "start_time",
      sort_order: sort_order || "asc",
    };

    const result = await eventRepository.getEvents(filters, pagination);

    const response: ApiResponse<PaginatedResponse<any>> = {
      status: "success",
      message: "Events retrieved successfully",
      data: {
        data: result.events,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNext: page < Math.ceil(result.total / limit),
          hasPrev: page > 1,
        },
      },
    };

    res.json(response);
  } catch (error) {
    logger.error("Failed to fetch events", { error });

    const response: ApiResponse = {
      status: "error",
      message: "Failed to fetch events",
    };

    res.status(500).json(response);
  }
});

// GET /api/events/:id - Get event details with participants
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const userId = req.user?.userId;

    if (!eventId || typeof eventId !== "string") {
      const response: ApiResponse = {
        status: "error",
        message: "Invalid event ID",
      };
      return res.status(400).json(response);
    }

    const event = await eventRepository.getEventById(eventId, userId);

    if (!event) {
      const response: ApiResponse = {
        status: "error",
        message: "Event not found",
      };
      return res.status(404).json(response);
    }

    // Get participants if user is admin/moderator or creator
    let participants = null;
    if (
      req.user &&
      (req.user.role === UserRole.ADMIN ||
        req.user.role === UserRole.MODERATOR ||
        event.created_by === req.user!.userId)
    ) {
      participants = await eventRepository.getEventParticipants(eventId);
    }

    const response: ApiResponse<
      EventWithDetailsQuery & { participants?: any[] }
    > = {
      status: "success",
      message: "Event details retrieved successfully",
      data: {
        ...event,
        ...(participants && { participants }),
      },
    };

    res.json(response);
  } catch (error) {
    logger.error("Failed to fetch event details", {
      error,
      eventId: req.params.id,
    });

    const response: ApiResponse = {
      status: "error",
      message: "Failed to fetch event details",
    };

    res.status(500).json(response);
  }
});

// PUT /api/events/:id - Update event (admin/moderator only)
router.put(
  "/:id",
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.MODERATOR]),
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;

      if (!eventId || typeof eventId !== "string") {
        const response: ApiResponse = {
          status: "error",
          message: "Invalid event ID",
        };
        return res.status(400).json(response);
      }

      const validation = validateUpdateEvent(req.body);
      if (!validation.isValid) {
        const response: ApiResponse = {
          status: "error",
          message: "Validation failed",
          errors: validation.errors,
        };
        return res.status(400).json(response);
      }

      // Check if event exists and user has permission to edit
      const existingEvent = await eventRepository.getEventById(eventId);
      if (!existingEvent) {
        const response: ApiResponse = {
          status: "error",
          message: "Event not found",
        };
        return res.status(404).json(response);
      }

      // Only allow editing if user is admin/moderator or creator
      if (
        req.user!.role !== UserRole.ADMIN &&
        req.user!.role !== UserRole.MODERATOR &&
        existingEvent.created_by !== req.user!.userId
      ) {
        const response: ApiResponse = {
          status: "error",
          message: "You don't have permission to edit this event",
        };
        return res.status(403).json(response);
      }

      const updateData: UpdateEventInput = {};

      if (req.body.title !== undefined)
        updateData.title = req.body.title.trim();
      if (req.body.description !== undefined)
        updateData.description = req.body.description?.trim() || null;
      if (req.body.event_type !== undefined)
        updateData.event_type = req.body.event_type;
      if (req.body.start_time !== undefined)
        updateData.start_time = new Date(req.body.start_time);
      if (req.body.end_time !== undefined)
        updateData.end_time = req.body.end_time
          ? new Date(req.body.end_time)
          : undefined;
      if (req.body.voice_channel_id !== undefined)
        updateData.voice_channel_id = req.body.voice_channel_id;
      if (req.body.max_participants !== undefined)
        updateData.max_participants = req.body.max_participants;
      if (req.body.status !== undefined) updateData.status = req.body.status;

      const updatedEvent = await eventRepository.updateEvent(
        eventId,
        updateData,
      );

      if (!updatedEvent) {
        const response: ApiResponse = {
          status: "error",
          message: "Event not found",
        };
        return res.status(404).json(response);
      }

      logger.info("Event updated successfully", {
        eventId,
        updatedBy: req.user!.userId,
        changes: Object.keys(updateData),
      });

      const response: ApiResponse<EventEntity> = {
        status: "success",
        message: "Event updated successfully",
        data: updatedEvent,
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to update event", {
        error,
        eventId: req.params.id,
        userId: req.user?.userId,
      });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to update event",
      };

      res.status(500).json(response);
    }
  },
);

// DELETE /api/events/:id - Delete event (admin/moderator only)
router.delete(
  "/:id",
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.MODERATOR]),
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;

      if (!eventId || typeof eventId !== "string") {
        const response: ApiResponse = {
          status: "error",
          message: "Invalid event ID",
        };
        return res.status(400).json(response);
      }

      // Check if event exists and user has permission to delete
      const existingEvent = await eventRepository.getEventById(eventId);
      if (!existingEvent) {
        const response: ApiResponse = {
          status: "error",
          message: "Event not found",
        };
        return res.status(404).json(response);
      }

      // Only allow deletion if user is admin/moderator or creator
      if (
        req.user!.role !== UserRole.ADMIN &&
        req.user!.role !== UserRole.MODERATOR &&
        existingEvent.created_by !== req.user!.userId
      ) {
        const response: ApiResponse = {
          status: "error",
          message: "You don't have permission to delete this event",
        };
        return res.status(403).json(response);
      }

      // Cleanup event before deletion (revoke all access)
      if (existingEvent.status === EventStatus.ACTIVE) {
        await eventAccessService.cleanupEvent(eventId, "event_deleted");
      }

      const deleted = await eventRepository.deleteEvent(eventId);

      if (!deleted) {
        const response: ApiResponse = {
          status: "error",
          message: "Event not found",
        };
        return res.status(404).json(response);
      }

      logger.info("Event deleted successfully", {
        eventId,
        eventTitle: existingEvent.title,
        deletedBy: req.user!.userId,
      });

      const response: ApiResponse = {
        status: "success",
        message: "Event deleted successfully",
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to delete event", {
        error,
        eventId: req.params.id,
        userId: req.user?.userId,
      });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to delete event",
      };

      res.status(500).json(response);
    }
  },
);

// POST /api/events/:id/end - End event and cleanup (admin/moderator only)
router.post(
  "/:id/end",
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.MODERATOR]),
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;

      if (!eventId || typeof eventId !== "string") {
        const response: ApiResponse = {
          status: "error",
          message: "Invalid event ID",
        };
        return res.status(400).json(response);
      }

      const existingEvent = await eventRepository.getEventById(eventId);
      if (!existingEvent) {
        const response: ApiResponse = {
          status: "error",
          message: "Event not found",
        };
        return res.status(404).json(response);
      }

      if (existingEvent.status === EventStatus.COMPLETED) {
        const response: ApiResponse = {
          status: "error",
          message: "Event is already completed",
        };
        return res.status(400).json(response);
      }

      // Cleanup event and update status
      const cleanupResult = await eventAccessService.cleanupEvent(
        eventId,
        "manually_ended",
      );

      logger.info("Event ended manually", {
        eventId,
        eventTitle: existingEvent.title,
        endedBy: req.user!.userId,
        cleanupStats: cleanupResult.stats,
      });

      const response: ApiResponse<typeof cleanupResult> = {
        status: "success",
        message: "Event ended successfully",
        data: cleanupResult,
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to end event", {
        error,
        eventId: req.params.id,
        userId: req.user?.userId,
      });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to end event",
      };

      res.status(500).json(response);
    }
  },
);

// ==================== User Routes ====================

// POST /api/events/:id/request-access - Request voice channel access
router.post(
  "/:id/request-access",
  authenticateToken,
  accessRequestRateLimit,
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      const userId = req.user!.userId;

      if (!eventId || typeof eventId !== "string") {
        const response: ApiResponse = {
          status: "error",
          message: "Invalid event ID",
        };
        return res.status(400).json(response);
      }

      const result = await eventAccessService.requestEventAccess(
        eventId,
        userId,
      );

      const statusCode = result.success
        ? 200
        : result.error?.code === "EVENT_NOT_FOUND"
          ? 404
          : result.error?.code === "MISSING_REQUIRED_TAGS" ||
              result.error?.code === "DISCORD_NOT_LINKED" ||
              result.error?.code === "EVENT_TOO_EARLY" ||
              result.error?.code === "EVENT_FULL"
            ? 400
            : 500;

      const response: ApiResponse<typeof result.data> = {
        status: result.success ? "success" : "error",
        message: result.message,
        data: result.data,
        ...(result.error && { error: result.error }),
      };

      res.status(statusCode).json(response);
    } catch (error) {
      logger.error("Failed to process access request", {
        error,
        eventId: req.params.id,
        userId: req.user?.userId,
      });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to process access request",
      };

      res.status(500).json(response);
    }
  },
);

// DELETE /api/events/:id/revoke-access - Leave event/revoke own access
router.delete(
  "/:id/revoke-access",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      const userId = req.user!.userId;

      if (!eventId || typeof eventId !== "string") {
        const response: ApiResponse = {
          status: "error",
          message: "Invalid event ID",
        };
        return res.status(400).json(response);
      }

      const result = await eventAccessService.revokeEventAccess(
        eventId,
        userId,
        "user_requested",
      );

      const statusCode = result.success
        ? 200
        : result.error?.code === "EVENT_NOT_FOUND"
          ? 404
          : 500;

      const response: ApiResponse<typeof result.data> = {
        status: result.success ? "success" : "error",
        message: result.message,
        data: result.data,
        ...(result.error && { error: result.error }),
      };

      res.status(statusCode).json(response);
    } catch (error) {
      logger.error("Failed to revoke access", {
        error,
        eventId: req.params.id,
        userId: req.user?.userId,
      });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to revoke access",
      };

      res.status(500).json(response);
    }
  },
);

// GET /api/events/:id/access-status - Check if user has access
router.get(
  "/:id/access-status",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      const userId = req.user!.userId;

      if (!eventId || typeof eventId !== "string") {
        const response: ApiResponse = {
          status: "error",
          message: "Invalid event ID",
        };
        return res.status(400).json(response);
      }

      const status = await eventAccessService.getUserAccessStatus(
        eventId,
        userId,
      );

      const response: ApiResponse<typeof status> = {
        status: "success",
        message: "Access status retrieved successfully",
        data: status,
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to get access status", {
        error,
        eventId: req.params.id,
        userId: req.user?.userId,
      });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to get access status",
      };

      res.status(500).json(response);
    }
  },
);

// GET /api/events/:id/eligibility - Check if user can join (shows missing tags)
router.get(
  "/:id/eligibility",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      const userId = req.user!.userId;

      if (!eventId || typeof eventId !== "string") {
        const response: ApiResponse = {
          status: "error",
          message: "Invalid event ID",
        };
        return res.status(400).json(response);
      }

      const eligibility = await eventAccessService.checkEventEligibility(
        eventId,
        userId,
      );

      const response: ApiResponse<typeof eligibility> = {
        status: "success",
        message: "Eligibility checked successfully",
        data: eligibility,
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to check eligibility", {
        error,
        eventId: req.params.id,
        userId: req.user?.userId,
      });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to check eligibility",
      };

      res.status(500).json(response);
    }
  },
);

export { router as eventsRouter };
