import { ApiResponse, PaginatedResponse } from "../types/api";
import { EventData, EventFilters } from "../schemas/event.validation";
import { Request, Response } from "express";

import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { EventType } from "../types/event";
import { eventService } from "../services/event.service";
import { logger } from "../utils/logger";

export class EventController {
  public createEvent = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const {
        title,
        description,
        eventType,
        difficultyLevel,
        scheduledAt,
        duration,
        capacity,
        prerequisiteRoles,
        discordChannelId,
        createDiscordEvent,
        createPrivateChannel,
      } = req.body as EventData;

      const createdBy = req.user!.userId;

      const result = await eventService.createEvent(
        {
          title,
          description,
          eventType,
          difficultyLevel,
          scheduledAt,
          duration,
          capacity,
          prerequisiteRoles,
          discordChannelId,
          createDiscordEvent,
          createPrivateChannel,
        },
        createdBy,
      );

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || "Failed to create event",
          errors: {
            event: result.error || "Event creation failed",
          },
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse<EventType> = {
        status: "success",
        data: result.data,
        message: "Event created successfully",
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error("Event creation failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to create event",
        errors: {
          server:
            error instanceof Error ? error.message : "Unknown server error",
        },
      };

      res.status(500).json(response);
    }
  };

  public updateEvent = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedBy = req.user!.userId;

      const result = await eventService.updateEvent(id, updateData, updatedBy);

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || "Failed to update event",
          errors: {
            event: result.error || "Event update failed",
          },
        };
        res
          .status(result.error === "Event not found" ? 404 : 400)
          .json(response);
        return;
      }

      const response: ApiResponse<EventType> = {
        status: "success",
        data: result.data,
        message: "Event updated successfully",
      };

      res.json(response);
    } catch (error) {
      logger.error("Event update failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to update event",
        errors: {
          server:
            error instanceof Error ? error.message : "Unknown server error",
        },
      };

      res.status(500).json(response);
    }
  };

  public deleteEvent = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const deletedBy = req.user!.userId;

      const result = await eventService.deleteEvent(id, reason, deletedBy);

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || "Failed to delete event",
          errors: {
            event: result.error || "Event deletion failed",
          },
        };
        res
          .status(result.error === "Event not found" ? 404 : 400)
          .json(response);
        return;
      }

      const response: ApiResponse = {
        status: "success",
        message: "Event deleted successfully",
      };

      res.json(response);
    } catch (error) {
      logger.error("Event deletion failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to delete event",
        errors: {
          server:
            error instanceof Error ? error.message : "Unknown server error",
        },
      };

      res.status(500).json(response);
    }
  };

  public getEvents = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {

      const {
        page,
        limit,
        search,
        eventType,
        difficultyLevel,
        status,
        upcoming,
        sortBy,
        sortOrder,
      } = req.query;

      const filters: EventFilters = {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        search: search as string | undefined,
        eventType: eventType as "voice" | "stage",
        difficultyLevel: difficultyLevel as
          | "beginner"
          | "intermediate"
          | "advanced",
        status: status as EventFilters["status"],
        upcoming: upcoming === "true",
        sortBy:
          (sortBy as "scheduledAt" | "title" | "createdAt") || "scheduledAt",
        sortOrder: (sortOrder as "asc" | "desc") || "asc",
      };
      
      const result = await eventService.getEvents(
        filters      );

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || "Failed to retrieve events",
          errors: {
            events: result.error || "Failed to fetch events",
          },
        };
        res.status(500).json(response);
        return;
      }

      const { events, total } = result.data!;
      const totalPages = Math.ceil(total / filters.limit);

      const response: ApiResponse<PaginatedResponse<EventType>> = {
        status: "success",
        data: {
          data: events,
          pagination: {
            page: filters.page,
            limit: filters.limit,
            total,
            totalPages,
          },
        },
        message: "Events retrieved successfully",
      };

      res.json(response);
    } catch (error) {
      logger.error("Get events failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to retrieve events",
        errors: {
          server:
            error instanceof Error ? error.message : "Unknown server error",
        },
      };

      res.status(500).json(response);
    }
  };

  public getEventById = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const result = await eventService.getEventById(id);

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || "Failed to retrieve event",
          errors: {
            event: result.error || "Event not found",
          },
        };
        res
          .status(
            result.error === "Event not found" ||
              result.error?.includes("Insufficient permissions")
              ? 404
              : 500,
          )
          .json(response);
        return;
      }

      const response: ApiResponse<EventType> = {
        status: "success",
        data: result.data,
        message: "Event retrieved successfully",
      };

      res.json(response);
    } catch (error) {
      logger.error("Get event by ID failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to retrieve event",
        errors: {
          server:
            error instanceof Error ? error.message : "Unknown server error",
        },
      };

      res.status(500).json(response);
    }
  };

  // Public endpoint for events (no authentication required)
  public getPublicEvents = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const {
        page,
        limit,
        search,
        eventType,
        difficultyLevel,
        status,
        upcoming,
        sortBy,
        sortOrder,
      } = req.query;

      const filters: EventFilters = {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        search: search as string | undefined,
        eventType: eventType as "voice" | "stage",
        difficultyLevel: difficultyLevel as
          | "beginner"
          | "intermediate"
          | "advanced",
        status: status as EventFilters["status"],
        upcoming: upcoming === "true",
        sortBy:
          (sortBy as "scheduledAt" | "title" | "createdAt") || "scheduledAt",
        sortOrder: (sortOrder as "asc" | "desc") || "asc",
      };

      const result = await eventService.getEvents(filters);

      if (!result.success) {
        const response: ApiResponse = {
          status: "error",
          message: result.error || "Failed to retrieve events",
          errors: {
            events: result.error || "Failed to fetch events",
          },
        };
        res.status(500).json(response);
        return;
      }

      const { events, total } = result.data!;

      // Remove sensitive information for public endpoint
      const publicEvents = events.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        difficultyLevel: event.difficultyLevel,
        scheduledAt: event.scheduledAt,
        duration: event.duration,
        capacity: event.capacity,
        prerequisiteRoles: event.prerequisiteRoles,
        createdAt: event.createdAt,
      }));

      const totalPages = Math.ceil(total / filters.limit);

      const response: ApiResponse<PaginatedResponse<(typeof publicEvents)[0]>> =
        {
          status: "success",
          data: {
            data: publicEvents,
            pagination: {
              page: filters.page,
              limit: filters.limit,
              total,
              totalPages,
            },
          },
          message: "Public events retrieved successfully",
        };

      res.json(response);
    } catch (error) {
      logger.error("Get public events failed:", error);

      const response: ApiResponse = {
        status: "error",
        message: "Failed to retrieve events",
        errors: {
          server:
            error instanceof Error ? error.message : "Unknown server error",
        },
      };

      res.status(500).json(response);
    }
  };
}

export const eventController = new EventController();
