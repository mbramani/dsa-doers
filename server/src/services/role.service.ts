import {
  ApplyRoleOptions,
  ApplyRoleResult,
  RemoveRoleOptions,
  RemoveRoleResult,
  RoleWithUserRoles,
} from "../types/role";
import {
  RoleActionData,
  RoleData,
  RoleFilters,
} from "../schemas/role.validation";

import { Role } from "@prisma/client";
import { ServiceResult } from "../types/service";
import { activityService } from "./activity.service";
import { discordService } from "./discord.service";
import { logger } from "../utils/logger";
import { prisma } from "./database.service";

export class RoleService {
  public async createRole(
    roleData: RoleData,
    createdBy: string,
  ): Promise<ServiceResult<RoleWithUserRoles>> {
    try {
      // Check if role name already exists
      const existingRole = await prisma.role.findUnique({
        where: { name: roleData.name },
      });

      if (existingRole) {
        return {
          success: false,
          error: `Role with name '${roleData.name}' already exists`,
        };
      }

      let discordRoleId: string | null = null;
      // Create Discord role if configuration provided
      if (roleData.discordRoleConfig && discordService.isReady()) {
        try {
          const discordResult = await discordService.createRole({
            name: roleData.name,
            color: roleData.color,
            permissions: roleData.discordRoleConfig.permissions || [],
            hoist: roleData.discordRoleConfig.hoist || false,
            mentionable: roleData.discordRoleConfig.mentionable || true,
            reason: `Created via API by admin - ${roleData.description}`,
          });

          if (discordResult.success && discordResult.data) {
            discordRoleId = discordResult.data.id;
          } else {
            logger.warn("Failed to create Discord role:", discordResult.error);
          }
        } catch (error) {
          logger.error("Discord role creation error:", error);
        }
      }

      // Create role in database
      const newRole = await prisma.role.create({
        data: {
          name: roleData.name,
          description: roleData.description,
          color: roleData.color,
          sortOrder: roleData.sortOrder,
          isSystemRole: roleData.isSystemRole,
          discordRoleId,
        },
        include: {
          userRoles: {
            where: { revokedAt: null },
            include: {
              user: {
                select: {
                  id: true,
                  discordUsername: true,
                },
              },
            },
          },
        },
      });

      // Log role creation
      await activityService.logActivity({
        actorId: createdBy,
        actorType: "USER",
        actionType: "ROLE_CREATED",
        entityType: "ROLE",
        entityId: newRole.id,
        details: {
          roleName: roleData.name,
          isSystemRole: roleData.isSystemRole,
          sortOrder: roleData.sortOrder,
          discordRoleId,
          discordRoleCreated: !!discordRoleId,
        },
      });

      return {
        success: true,
        data: newRole,
      };
    } catch (error) {
      logger.error("Failed to create role:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create role",
      };
    }
  }

  public async updateRole(
    roleId: string,
    updateData: Partial<RoleData>,
    updatedBy: string,
  ): Promise<ServiceResult<RoleWithUserRoles>> {
    try {
      // Check if role exists
      const existingRole = await prisma.role.findUnique({
        where: { id: roleId },
      });

      if (!existingRole) {
        return {
          success: false,
          error: "Role not found",
        };
      }

      // Check if name is being changed and if it conflicts
      if (updateData.name && updateData.name !== existingRole.name) {
        const nameConflict = await prisma.role.findUnique({
          where: { name: updateData.name },
        });

        if (nameConflict) {
          return {
            success: false,
            error: `Role with name '${updateData.name}' already exists`,
          };
        }
      }

      // Update Discord role if needed
      if (existingRole.discordRoleId && discordService.isReady()) {
        try {
          const discordUpdateData: any = {};
          const { name, color, discordRoleConfig } = updateData;
          const { permissions, hoist, mentionable } = discordRoleConfig ?? {};

          Object.assign(discordUpdateData, {
            ...(name && { name }),
            ...(color && { color }),
            ...(permissions && { permissions }),
            ...(hoist !== undefined && { hoist }),
            ...(mentionable !== undefined && { mentionable }),
          });

          discordUpdateData.reason = `Updated via API - ${updateData.description || existingRole.description}`;

          const discordResult = await discordService.updateRole(
            existingRole.discordRoleId,
            discordUpdateData,
          );

          if (!discordResult.success) {
            logger.warn("Failed to update Discord role:", discordResult.error);
          } else {
            logger.info("Discord role updated successfully", {
              roleId: existingRole.discordRoleId,
              roleName: updateData.name || existingRole.name,
            });
          }
        } catch (error) {
          logger.error("Discord role update error:", error);
        }
      }

      // Update role in database
      const updatedRole = await prisma.role.update({
        where: { id: roleId },
        data: {
          name: updateData.name,
          description: updateData.description,
          color: updateData.color,
          sortOrder: updateData.sortOrder,
          isSystemRole: updateData.isSystemRole,
        },
        include: {
          userRoles: {
            where: { revokedAt: null },
            include: {
              user: {
                select: {
                  id: true,
                  discordUsername: true,
                },
              },
            },
          },
        },
      });

      // Log role update
      await activityService.logActivity({
        actorId: updatedBy,
        actorType: "USER",
        actionType: "ROLE_UPDATED",
        entityType: "ROLE",
        entityId: roleId,
        details: {
          oldData: existingRole,
          newData: updateData,
          roleName: updatedRole.name,
        },
      });

      return {
        success: true,
        data: updatedRole,
      };
    } catch (error) {
      logger.error("Failed to update role:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update role",
      };
    }
  }

  public async deleteRole(
    roleId: string,
    deletedBy: string,
  ): Promise<ServiceResult<boolean>> {
    try {
      // Check if role exists
      const existingRole = await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          userRoles: {
            where: { revokedAt: null },
          },
        },
      });

      if (!existingRole) {
        return {
          success: false,
          error: "Role not found",
        };
      }

      // Check if role is in use
      if (existingRole.userRoles.length > 0) {
        return {
          success: false,
          error: `Cannot delete role '${existingRole.name}' as it is assigned to ${existingRole.userRoles.length} user(s)`,
        };
      }

      // Delete Discord role if exists
      if (existingRole.discordRoleId && discordService.isReady()) {
        try {
          const deleteResult = await discordService.deleteRole(
            existingRole.discordRoleId,
          );
          if (!deleteResult.success) {
            logger.warn(`Failed to delete Discord role: ${deleteResult.error}`);
          }
        } catch (error) {
          logger.error("Discord role deletion error:", error);
        }
      }

      // Soft delete (archive) the role
      await prisma.role.update({
        where: { id: roleId },
        data: {
          isArchived: true,
        },
      });

      // Log role deletion
      await activityService.logActivity({
        actorId: deletedBy,
        actorType: "USER",
        actionType: "ROLE_DELETED",
        entityType: "ROLE",
        entityId: roleId,
        details: {
          roleName: existingRole.name,
          isSystemRole: existingRole.isSystemRole,
          discordRoleId: existingRole.discordRoleId,
        },
      });

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      logger.error("Failed to delete role:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete role",
      };
    }
  }

  public async getRoles(
    filters: RoleFilters,
  ): Promise<ServiceResult<{ roles: RoleWithUserRoles[]; total: number }>> {
    try {
      const where: any = {
        isArchived: false,
      };

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      if (filters.isSystemRole !== undefined) {
        where.isSystemRole = filters.isSystemRole;
      }

      const [roles, total] = await Promise.all([
        prisma.role.findMany({
          where,
          include: {
            userRoles: {
              where: { revokedAt: null },
              include: {
                user: {
                  select: {
                    id: true,
                    discordUsername: true,
                    discordAvatar: true,
                  },
                },
              },
            },
          },
          orderBy: {
            [filters.sortBy]: filters.sortOrder,
          },
          ...(filters.all
            ? {}
            : {
                skip: (filters.page - 1) * filters.limit,
                take: filters.limit,
              }),
        }),
        prisma.role.count({ where }),
      ]);

      return {
        success: true,
        data: { roles, total },
      };
    } catch (error) {
      logger.error("Failed to get roles:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to retrieve roles",
      };
    }
  }

  public async getRoleById(
    roleId: string,
  ): Promise<ServiceResult<RoleWithUserRoles>> {
    try {
      const role = await prisma.role.findUnique({
        where: {
          id: roleId,
          isArchived: false,
        },
        include: {
          userRoles: {
            where: { revokedAt: null },
            include: {
              user: {
                select: {
                  id: true,
                  discordUsername: true,
                  discordAvatar: true,
                },
              },
              granter: {
                select: {
                  id: true,
                  discordUsername: true,
                },
              },
            },
          },
        },
      });

      if (!role) {
        return {
          success: false,
          error: "Role not found",
        };
      }

      return {
        success: true,
        data: role,
      };
    } catch (error) {
      logger.error("Failed to get role by ID:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to retrieve role",
      };
    }
  }

  public async assignNewbieRole(
    userId: string,
  ): Promise<ServiceResult<boolean>> {
    const result = await this.applyRoleToUser({
      userId,
      roleNames: ["NEWBIE"],
      reason: "Automatic assignment for new user",
      syncWithDiscord: true,
    });

    // Return proper ServiceResult format
    return {
      success: result.success,
      data: result.success,
      error: result.success
        ? undefined
        : result.error?.includes("Roles not found: NEWBIE")
          ? "NEWBIE role not configured"
          : result.error,
    };
  }

  public async applyRoleToUser(
    options: ApplyRoleOptions,
  ): Promise<ApplyRoleResult> {
    const {
      userId,
      roleNames,
      grantedBy,
      reason,
      syncWithDiscord = true,
    } = options;

    try {
      logger.info("Starting role application process", {
        userId,
        roleNames,
        grantedBy,
        reason,
      });

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            where: { revokedAt: null },
            include: { role: true },
          },
        },
      });

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Get roles to apply
      const rolesToApply = await prisma.role.findMany({
        where: {
          name: { in: roleNames },
          isArchived: false,
        },
      });

      if (rolesToApply.length !== roleNames.length) {
        const foundRoleNames = rolesToApply.map((r) => r.name);
        const missingRoles = roleNames.filter(
          (name) => !foundRoleNames.includes(name),
        );
        throw new Error(`Roles not found: ${missingRoles.join(", ")}`);
      }

      // Check which roles user already has
      const existingRoleIds = user.userRoles.map((ur) => ur.roleId);
      const newRoles = rolesToApply.filter(
        (role) => !existingRoleIds.includes(role.id),
      );
      const skippedRoles = rolesToApply.filter((role) =>
        existingRoleIds.includes(role.id),
      );

      if (newRoles.length === 0) {
        logger.info("User already has all specified roles", {
          userId,
          roleNames,
        });
        return {
          success: true,
          appliedRoles: [],
          skippedRoles: skippedRoles.map((r) => r.name),
        };
      }

      // Apply new roles in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const appliedRoles = [];

        for (const role of newRoles) {
          try {
            // Check if user had this role before (including revoked ones)
            const existingUserRole = await tx.userRole.findUnique({
              where: {
                userId_roleId: {
                  userId: userId,
                  roleId: role.id,
                },
              },
              include: {
                role: true,
                user: true,
                granter: {
                  select: {
                    id: true,
                    discordUsername: true,
                  },
                },
              },
            });

            let userRole;

            if (existingUserRole && existingUserRole.revokedAt) {
              // Update the revoked role to active again
              userRole = await tx.userRole.update({
                where: { id: existingUserRole.id },
                data: {
                  grantedAt: new Date(),
                  grantedBy: grantedBy || null,
                  grantReason: reason || "System role assignment",
                  revokedAt: null,
                  revokedBy: null,
                  revokeReason: null,
                  isSystemGranted: !grantedBy,
                },
                include: {
                  role: true,
                  user: true,
                  granter: {
                    select: {
                      id: true,
                      discordUsername: true,
                    },
                  },
                },
              });
            } else {
              // Create new user role assignment
              userRole = await tx.userRole.create({
                data: {
                  userId: userId,
                  roleId: role.id,
                  grantedBy: grantedBy || null,
                  grantReason: reason || "System role assignment",
                  isSystemGranted: !grantedBy,
                },
                include: {
                  role: true,
                  user: true,
                  granter: {
                    select: {
                      id: true,
                      discordUsername: true,
                    },
                  },
                },
              });
            }

            // Log the role assignment
            await tx.activityLog.create({
              data: {
                actorId: grantedBy || null,
                actorType: grantedBy ? "USER" : "SYSTEM",
                actionType: existingUserRole?.revokedAt
                  ? "ROLE_REASSIGNED"
                  : "ROLE_ASSIGNED",
                entityType: "USER",
                entityId: userId,
                details: {
                  roleId: role.id,
                  roleName: role.name,
                  reason: reason || "System role assignment",
                  isSystemGranted: !grantedBy,
                  grantedBy: grantedBy || "system",
                  sortOrder: role.sortOrder,
                  isSystemRole: role.isSystemRole,
                  discordRoleId: role.discordRoleId,
                  wasReassigned: !!existingUserRole?.revokedAt,
                },
              },
            });

            appliedRoles.push(userRole);

            const actionType = existingUserRole?.revokedAt
              ? "Reassigned"
              : "Applied";
            logger.info(
              `${actionType} role ${role.name} to user ${user.discordUsername}`,
              {
                userId,
                roleId: role.id,
                roleName: role.name,
                grantedBy: grantedBy || "system",
                wasReassigned: !!existingUserRole?.revokedAt,
              },
            );
          } catch (error) {
            logger.error(
              `Failed to apply role ${role.name} to user ${userId}:`,
              error,
            );
            throw error;
          }
        }

        return appliedRoles;
      });

      // Sync with Discord if enabled
      if (syncWithDiscord && result.length > 0) {
        try {
          await this.syncUserRolesWithDiscord(
            userId,
            result.map((ur) => ur.role),
          );
        } catch (error) {
          logger.error("Failed to sync roles with Discord:", error);
          // Don't fail the entire operation for Discord sync issues
        }
      }

      logger.info("Role application completed successfully", {
        userId,
        appliedRoles: result.map((ur) => ur.role.name),
        skippedRoles: skippedRoles.map((r) => r.name),
      });

      return {
        success: true,
        appliedRoles: result.map((ur) => ur.role.name),
        skippedRoles: skippedRoles.map((r) => r.name),
      };
    } catch (error) {
      logger.error("Failed to apply roles to user:", error, {
        userId,
        roleNames,
      });

      // Log the failure
      await prisma.activityLog.create({
        data: {
          actorId: grantedBy || null,
          actorType: grantedBy ? "USER" : "SYSTEM",
          actionType: "ROLE_ASSIGNMENT_FAILED",
          entityType: "USER",
          entityId: userId,
          details: {
            roleNames,
            error: error instanceof Error ? error.message : "Unknown error",
            reason,
            grantedBy: grantedBy || "system",
          },
        },
      });

      return {
        success: false,
        appliedRoles: [],
        skippedRoles: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  public async removeRoleFromUser(
    removalOptions: RemoveRoleOptions,
  ): Promise<RemoveRoleResult> {
    const {
      userId,
      roleNames,
      revokedBy,
      reason,
      syncWithDiscord = true,
    } = removalOptions;

    try {
      logger.info("Starting role removal process", {
        userId,
        roleNames,
        revokedBy,
        reason,
      });

      // Get user with current roles
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            where: { revokedAt: null },
            include: { role: true },
          },
        },
      });

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Find roles to remove (only active roles)
      const rolesToRemove = user.userRoles.filter((ur) =>
        roleNames.includes(ur.role.name),
      );

      // Find roles that user doesn't have (to skip)
      const userActiveRoleNames = user.userRoles.map((ur) => ur.role.name);
      const skippedRoles = roleNames.filter(
        (name) => !userActiveRoleNames.includes(name),
      );

      if (rolesToRemove.length === 0) {
        logger.info("User does not have any of the specified active roles", {
          userId,
          roleNames,
        });
        return {
          success: true,
          revokedRoles: [],
          skippedRoles: skippedRoles,
        };
      }

      // Remove roles in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const revokedRoles = [];

        for (const userRole of rolesToRemove) {
          // Update the role to revoked
          await tx.userRole.update({
            where: { id: userRole.id },
            data: {
              revokedAt: new Date(),
              revokedBy: revokedBy || null,
              revokeReason: reason || "Role removed",
            },
          });

          // Log the role removal
          await tx.activityLog.create({
            data: {
              actorId: revokedBy || null,
              actorType: revokedBy ? "USER" : "SYSTEM",
              actionType: "ROLE_REVOKED",
              entityType: "USER",
              entityId: userId,
              details: {
                roleId: userRole.role.id,
                roleName: userRole.role.name,
                reason: reason || "Role removed",
                revokedBy: revokedBy || "system",
                discordRoleId: userRole.role.discordRoleId,
              },
            },
          });

          revokedRoles.push(userRole.role.name);

          logger.info(
            `Removed role ${userRole.role.name} from user ${user.discordUsername}`,
            {
              userId,
              roleId: userRole.role.id,
              roleName: userRole.role.name,
              revokedBy: revokedBy || "system",
            },
          );
        }

        return revokedRoles;
      });

      // Sync with Discord if enable
      if (syncWithDiscord && rolesToRemove.length > 0) {
        try {
          // Pass empty array since we just want to sync current state after removal
          await this.syncUserRolesWithDiscord(userId, []);
        } catch (error) {
          logger.error("Failed to sync role removal with Discord:", error);
          // Don't fail the entire operation for Discord sync issues
        }
      }

      logger.info("Role removal completed successfully", {
        userId,
        revokedRoles: result,
        skippedRoles: skippedRoles,
      });

      return {
        success: true,
        revokedRoles: result,
        skippedRoles: skippedRoles,
      };
    } catch (error) {
      logger.error("Failed to remove roles from user:", error, {
        userId,
        roleNames,
      });

      // Log the failure
      await prisma.activityLog.create({
        data: {
          actorId: revokedBy || null,
          actorType: revokedBy ? "USER" : "SYSTEM",
          actionType: "ROLE_REMOVAL_FAILED",
          entityType: "USER",
          entityId: userId,
          details: {
            roleNames,
            error: error instanceof Error ? error.message : "Unknown error",
            reason,
            revokedBy: revokedBy || "system",
          },
        },
      });

      return {
        success: false,
        revokedRoles: [],
        skippedRoles: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  public async bulkApplyRoles(assignments: ApplyRoleOptions[]): Promise<
    ServiceResult<{
      success: number;
      failed: number;
      results: ApplyRoleResult[];
      errors: Array<{ userId: string; roleNames: string[]; error: string }>;
    }>
  > {
    try {
      let success = 0;
      let failed = 0;
      const results: ApplyRoleResult[] = [];
      const errors: Array<{
        userId: string;
        roleNames: string[];
        error: string;
      }> = [];

      logger.info(
        `Starting bulk role assignment for ${assignments.length} users`,
      );

      // Process in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < assignments.length; i += batchSize) {
        const batch = assignments.slice(i, i + batchSize);

        const batchPromises = batch.map(async (assignment) => {
          try {
            const result = await this.applyRoleToUser(assignment);
            results.push(result);

            if (result.success) {
              success++;
            } else {
              failed++;
              errors.push({
                userId: assignment.userId,
                roleNames: assignment.roleNames,
                error: result.error || "Unknown error",
              });
            }
          } catch (error) {
            failed++;
            const errorResult: ApplyRoleResult = {
              success: false,
              appliedRoles: [],
              skippedRoles: [],
              error: error instanceof Error ? error.message : "Unknown error",
            };
            results.push(errorResult);
            errors.push({
              userId: assignment.userId,
              roleNames: assignment.roleNames,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        });

        await Promise.all(batchPromises);
      }

      logger.info("Bulk role assignment completed", {
        success,
        failed,
        total: assignments.length,
      });

      return {
        success: true,
        data: { success, failed, results, errors },
      };
    } catch (error) {
      logger.error("Bulk role assignment failed:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Bulk role assignment failed",
      };
    }
  }

  private async syncUserRolesWithDiscord(
    userId: string,
    roles: Role[],
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          discordId: true,
          discordUsername: true,
          userRoles: {
            where: { revokedAt: null },
            include: { role: true },
          },
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Get platform role names (all active roles)
      const platformRoles = user.userRoles.map((ur) => ur.role.name);

      // Use Discord service's syncUserRoles method
      const syncResult = await discordService.syncUserRoles(
        user.discordId,
        platformRoles,
      );

      if (!syncResult.success) {
        logger.error("Discord role sync failed:", syncResult.error);
        throw new Error(syncResult.error || "Discord role sync failed");
      }

      // Log successful Discord sync
      await prisma.activityLog.create({
        data: {
          actorType: "SYSTEM",
          actionType: "DISCORD_ROLE_SYNC_SUCCESS",
          entityType: "USER",
          entityId: userId,
          details: {
            discordId: user.discordId,
            discordUsername: user.discordUsername,
            syncedRoles: roles.map((r) => ({
              roleName: r.name,
              discordRoleId: r.discordRoleId,
            })),
            syncResult: syncResult.data,
            currentActiveRoles: platformRoles,
          },
        },
      });

      logger.info("Discord roles synced successfully", {
        userId,
        discordId: user.discordId,
        roleCount: platformRoles.length,
        syncResult: syncResult.data,
      });
    } catch (error) {
      // Log Discord sync failure
      await prisma.activityLog.create({
        data: {
          actorType: "SYSTEM",
          actionType: "DISCORD_ROLE_SYNC_FAILED",
          entityType: "USER",
          entityId: userId,
          details: {
            error: error instanceof Error ? error.message : "Unknown error",
            roles: roles.map((r) => r.name),
          },
        },
      });

      throw error;
    }
  }
}

export const roleService = new RoleService();
