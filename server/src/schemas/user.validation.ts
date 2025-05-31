import { z } from "zod";

// User filters schema
export const userFiltersSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .default("1")
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0, "Page must be greater than 0"),
    limit: z
      .string()
      .optional()
      .default("20")
      .transform((val) => parseInt(val, 10))
      .refine(
        (val) => val > 0 && val <= 100,
        "Limit must be between 1 and 100",
      ),
    search: z.string().optional(),
    role: z.string().optional(),
    status: z.enum(["active", "archived", "all"]).optional().default("active"),
    registeredAfter: z
      .string()
      .datetime("Invalid date format")
      .transform((str) => new Date(str))
      .optional(),
    registeredBefore: z
      .string()
      .datetime("Invalid date format")
      .transform((str) => new Date(str))
      .optional(),
    sortBy: z
      .enum(["createdAt", "discordUsername", "lastActivity"])
      .optional()
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  }),
});

// User status management schema
export const userStatusSchema = z.object({
  params: z.object({
    userId: z.string().cuid("Invalid user ID format"),
  }),
  body: z.object({
    action: z.enum(["archive", "restore"], {
      errorMap: () => ({
        message: "Action must be either 'archive' or 'restore'",
      }),
    }),
    reason: z
      .string()
      .min(1, "Reason is required")
      .max(500, "Reason must be 500 characters or less"),
  }),
});

// Role assignment schema
export const assignRoleSchema = z.object({
  params: z.object({
    userId: z.string().cuid("Invalid user ID format"),
  }),
  body: z.object({
    roleNames: z
      .array(z.string())
      .min(1, "At least one role name is required")
      .max(10, "Cannot assign more than 10 roles at once"),
    reason: z
      .string()
      .min(1, "Reason is required")
      .max(500, "Reason must be 500 characters or less"),
    syncWithDiscord: z.boolean().default(true),
  }),
});

// Role removal schema
export const removeRoleSchema = z.object({
  params: z.object({
    userId: z.string().cuid("Invalid user ID format"),
    roleId: z.string().cuid("Invalid role ID format"),
  }),
  body: z.object({
    reason: z
      .string()
      .min(1, "Reason is required")
      .max(500, "Reason must be 500 characters or less"),
  }),
});

// Force sync schema
export const forceSyncSchema = z.object({
  params: z.object({
    userId: z.string().cuid("Invalid user ID format"),
  }),
  body: z.object({
    reason: z
      .string()
      .min(1, "Reason is required")
      .max(200, "Reason must be 200 characters or less")
      .default("Admin forced sync"),
  }),
});

// Extract the inferred types
export type UserFiltersRequest = z.infer<typeof userFiltersSchema>;
export type UserFilters = z.infer<typeof userFiltersSchema>["query"];
export type UserStatusRequest = z.infer<typeof userStatusSchema>;
export type AssignRoleRequest = z.infer<typeof assignRoleSchema>;
export type RemoveRoleRequest = z.infer<typeof removeRoleSchema>;
export type ForceSyncRequest = z.infer<typeof forceSyncSchema>;
