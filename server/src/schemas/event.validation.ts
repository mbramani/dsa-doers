import { z } from "zod";

const baseEventBodySchema = z.object({
  title: z
    .string()
    .min(1, "Event title is required")
    .max(100, "Event title must be 100 characters or less"),
  description: z
    .string()
    .min(1, "Event description is required")
    .max(2000, "Event description must be 2000 characters or less"),
  eventType: z.enum(["voice", "stage"], {
    errorMap: () => ({
      message: "Event type must be either 'voice' or 'stage'",
    }),
  }),
  difficultyLevel: z
    .enum(["beginner", "intermediate", "advanced"])
    .default("beginner")
    .optional(),
  status: z
    .enum(["scheduled", "active", "completed", "cancelled"])
    .default("scheduled")
    .optional(),
  scheduledAt: z
    .string()
    .datetime("Invalid date format. Use ISO 8601 format")
    .transform((str) => new Date(str))
    .refine((date) => date > new Date(), {
      message: "Event must be scheduled in the future",
    }),
  duration: z
    .number()
    .int("Duration must be an integer")
    .min(15, "Duration must be at least 15 minutes")
    .max(480, "Duration must be 8 hours or less")
    .optional(),
  capacity: z
    .number()
    .int("Capacity must be an integer")
    .min(1, "Capacity must be at least 1")
    .max(100, "Capacity must be 100 or less")
    .optional(),
  prerequisiteRoles: z
    .array(z.string())
    .max(10, "Cannot have more than 10 prerequisite roles")
    .default([]),
  discordChannelId: z
    .string()
    .regex(/^\d{17,19}$/, "Invalid Discord channel ID format")
    .optional(),
});

export const createEventSchema = z.object({
  body: baseEventBodySchema.extend({
    createDiscordEvent: z.boolean().default(true),
    createPrivateChannel: z.boolean().default(false),
  }),
});

export const updateEventSchema = z.object({
  params: z.object({
    id: z.string().cuid("Invalid event ID format"),
  }),
  body: baseEventBodySchema.partial(),
});

export const eventQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default("1"),
    limit: z.string().regex(/^\d+$/).transform(Number).default("20"),
    search: z.string().optional(),
    eventType: z.enum(["voice", "stage"]).optional(),
    difficultyLevel: z
      .enum(["beginner", "intermediate", "advanced"])
      .optional(),
    status: z
      .enum(["scheduled", "active", "completed", "cancelled"])
      .optional(),
    upcoming: z
      .string()
      .transform((val) => val === "true")
      .optional(),
    sortBy: z
      .enum(["scheduledAt", "title", "createdAt"])
      .default("scheduledAt"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
  }),
});

export const deleteEventSchema = z.object({
  params: z.object({
    id: z.string().cuid("Invalid event ID format"),
  }),
  body: z.object({
    reason: z
      .string()
      .min(1, "Reason for deletion is required")
      .max(500, "Reason must be 500 characters or less"),
  }),
});

export type CreateEventRequest = z.infer<typeof createEventSchema>;
export type UpdateEventRequest = z.infer<typeof updateEventSchema>;
export type EventQueryRequest = z.infer<typeof eventQuerySchema>;
export type DeleteEventRequest = z.infer<typeof deleteEventSchema>;

export type EventData = z.infer<typeof baseEventBodySchema> & {
  createDiscordEvent?: boolean;
  createPrivateChannel?: boolean;
};
export type EventFilters = z.infer<typeof eventQuerySchema.shape.query>;
