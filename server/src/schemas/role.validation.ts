import { z } from "zod";

// Role validation schemas
export const createRoleSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, "Role name is required")
      .max(50, "Role name must be 50 characters or less")
      .regex(
        /^[A-Za-z0-9_]+$/,
        "Role name must contain only letters, numbers, and underscores",
      ),
    description: z
      .string()
      .min(1, "Description is required")
      .max(500, "Description must be 500 characters or less"),
    color: z
      .string()
      .regex(
        /^#[0-9A-Fa-f]{6}$/,
        "Color must be a valid hex color (e.g., #FF0000)",
      ),
    sortOrder: z
      .number()
      .int("Sort order must be an integer")
      .min(0, "Sort order must be 0 or greater")
      .max(999, "Sort order must be 999 or less"),
    isSystemRole: z.boolean().default(false),
    discordRoleConfig: z
      .object({
        permissions: z.array(z.string()).optional(),
        hoist: z.boolean().default(false),
        mentionable: z.boolean().default(true),
      })
      .default({
        permissions: [],
        hoist: false,
        mentionable: true,
      }),
  }),
});

const baseRoleBodySchema = createRoleSchema.shape.body;

export const updateRoleSchema = z.object({
  params: z.object({
    id: z.string().cuid("Invalid role ID format"),
  }),
  body: baseRoleBodySchema.partial(),
});

// Base for assigning or revoking roles
const baseRoleActionBodySchema = z.object({
  userId: z.string().cuid("Invalid user ID format"),
  roleNames: z
    .array(z.string())
    .min(1, "At least one role name is required")
    .max(10, "Cannot use more than 10 roles at once"),
  reason: z
    .string()
    .min(1, "Reason is required")
    .max(500, "Reason must be 500 characters or less"),
  syncWithDiscord: z.boolean().default(true),
});

export const assignRoleSchema = z.object({
  body: baseRoleActionBodySchema,
});

export const revokeRoleSchema = z.object({
  body: baseRoleActionBodySchema,
});

export const roleQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default("1"),
    limit: z.string().regex(/^\d+$/).transform(Number).default("20"),
    search: z.string().optional(),
    isSystemRole: z
      .string()
      .transform((val) => val === "true")
      .optional(),
    sortBy: z.enum(["name", "sortOrder", "createdAt"]).default("sortOrder"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
  }),
});

export type CreateRoleRequest = z.infer<typeof createRoleSchema>;
export type UpdateRoleRequest = z.infer<typeof updateRoleSchema>;
export type AssignRoleRequest = z.infer<typeof assignRoleSchema>;
export type RevokeRoleRequest = z.infer<typeof revokeRoleSchema>;
export type RoleQueryRequest = z.infer<typeof roleQuerySchema>;

export type RoleData = z.infer<typeof baseRoleBodySchema>;
export type RoleFilters = z.infer<typeof roleQuerySchema.shape.query>;
export type RoleActionData = z.infer<typeof baseRoleActionBodySchema>;
