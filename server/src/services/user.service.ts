import { ApplyRoleResult, RemoveRoleResult } from "../types/role";

import { ServiceResult } from "../types/service";
import { UserFilters } from "../schemas/user.validation";
import { UserWithRoles } from "../types/auth";
import { activityService } from "./activity.service";
import { discordService } from "./discord.service";
import { logger } from "../utils/logger";
import { prisma } from "./database.service";
import { roleService } from "./role.service";

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  archivedUsers: number;
  newUsersThisMonth: number;
  roleDistribution: Array<{
    roleName: string;
    count: number;
  }>;
  registrationTrend: Array<{
    date: string;
    count: number;
  }>;
}

export class UserService {
  public async getUsers(
    filters: UserFilters,
  ): Promise<ServiceResult<{ users: UserWithRoles[]; total: number }>> {
    try {
      const where: any = {};

      // Status filter
      if (filters.status === "active") {
        where.isArchived = false;
      } else if (filters.status === "archived") {
        where.isArchived = true;
      }

      // Search filter
      if (filters.search) {
        where.OR = [
          {
            discordUsername: { contains: filters.search, mode: "insensitive" },
          },
          { email: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      // Role filter
      if (filters.role) {
        where.userRoles = {
          some: {
            role: {
              name: filters.role,
            },
            revokedAt: null,
          },
        };
      }

      // Date filters
      if (filters.registeredAfter || filters.registeredBefore) {
        where.createdAt = {};
        if (filters.registeredAfter) {
          where.createdAt.gte = filters.registeredAfter;
        }
        if (filters.registeredBefore) {
          where.createdAt.lte = filters.registeredBefore;
        }
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            userRoles: {
              include: { role: true },
              where: { revokedAt: null },
              orderBy: { grantedAt: "desc" },
            },
          },
          orderBy: {
            [filters.sortBy]: filters.sortOrder,
          },
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit,
        }),
        prisma.user.count({ where }),
      ]);

      return {
        success: true,
        data: { users, total },
      };
    } catch (error) {
      logger.error("Failed to get users:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to retrieve users",
      };
    }
  }

  public async getUserAnalytics(): Promise<ServiceResult<UserAnalytics>> {
    try {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalUsers,
        activeUsers,
        archivedUsers,
        newUsersThisMonth,
        roleDistribution,
        registrationTrend,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isArchived: false } }),
        prisma.user.count({ where: { isArchived: true } }),
        prisma.user.count({
          where: {
            createdAt: { gte: thisMonth },
            isArchived: false,
          },
        }),
        // Role distribution
        prisma.role
          .findMany({
            where: { isArchived: false },
            include: {
              userRoles: {
                where: {
                  revokedAt: null,
                  user: { isArchived: false },
                },
              },
            },
          })
          .then((roles) =>
            roles
              .map((role) => ({
                roleName: role.name,
                count: role.userRoles.length,
              }))
              .filter((item) => item.count > 0),
          ),
        // Registration trend (last 30 days)
        prisma.$queryRaw<{ date: Date; count: number }[]>`
          SELECT 
            DATE(created_at) as date,
            COUNT(*)::int as count
          FROM users 
          WHERE created_at >= ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `.then((result) =>
          result.map((row) => ({
            date: row.date.toISOString().split("T")[0],
            count: row.count,
          })),
        ),
      ]);

      return {
        success: true,
        data: {
          totalUsers,
          activeUsers,
          archivedUsers,
          newUsersThisMonth,
          roleDistribution,
          registrationTrend,
        },
      };
    } catch (error) {
      logger.error("Failed to get user analytics:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve user analytics",
      };
    }
  }

  public async updateUserStatus(
    userId: string,
    action: "archive" | "restore",
    reason: string,
    adminId: string,
  ): Promise<ServiceResult<UserWithRoles>> {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            include: { role: true },
            where: { revokedAt: null },
          },
        },
      });

      if (!existingUser) {
        return {
          success: false,
          error: "User not found",
        };
      }

      const newStatus = action === "archive";

      // Check if action is needed
      if (existingUser.isArchived === newStatus) {
        return {
          success: false,
          error: `User is already ${action}d`,
        };
      }

      // Update user status
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { isArchived: newStatus },
        include: {
          userRoles: {
            include: { role: true },
            where: { revokedAt: null },
          },
        },
      });

      // Log the action
      await activityService.logActivity({
        actorId: adminId,
        actorType: "USER",
        actionType: action === "archive" ? "USER_ARCHIVED" : "USER_RESTORED",
        entityType: "USER",
        entityId: userId,
        details: {
          reason,
          targetUser: {
            discordId: existingUser.discordId,
            discordUsername: existingUser.discordUsername,
          },
          previousStatus: existingUser.isArchived ? "archived" : "active",
          newStatus: newStatus ? "archived" : "active",
        },
      });

      logger.info(`User ${action}d successfully`, {
        userId,
        adminId,
        action,
        reason,
      });

      return {
        success: true,
        data: updatedUser,
      };
    } catch (error) {
      logger.error(`Failed to ${action} user:`, error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : `Failed to ${action} user`,
      };
    }
  }

  public async assignRoles(
    userId: string,
    roleNames: string[],
    reason: string,
    adminId: string,
    syncWithDiscord: boolean = true,
  ): Promise<ServiceResult<ApplyRoleResult>> {
    try {
      const result = await roleService.applyRoleToUser({
        userId,
        roleNames,
        grantedBy: adminId,
        reason,
        syncWithDiscord,
      });

      return result;
    } catch (error) {
      logger.error("Failed to assign roles:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to assign roles",
      };
    }
  }

  public async removeRole(
    userId: string,
    roleId: string,
    reason: string,
    adminId: string,
  ): Promise<ServiceResult<RemoveRoleResult>> {
    try {
      // Get role name
      const role = await prisma.role.findUnique({
        where: { id: roleId },
        select: { name: true },
      });

      if (!role) {
        return {
          success: false,
          error: "Role not found",
        };
      }

      const result = await roleService.removeRoleFromUser({
        userId,
        roleNames: [role.name],
        revokedBy: adminId,
        reason,
        syncWithDiscord: true,
      });

      return result;
    } catch (error) {
      logger.error("Failed to remove role:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to remove role",
      };
    }
  }

  public async forceSyncUser(
    userId: string,
    reason: string,
    adminId: string,
  ): Promise<
    ServiceResult<{
      added: string[];
      removed: string[];
      errors: string[];
    }>
  > {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          discordId: true,
          discordUsername: true,
          userRoles: {
            select: { role: { select: { name: true } } },
          },
        },
      });

      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      if (!user.discordId) {
        return {
          success: false,
          error: "User has no Discord ID",
        };
      }

      // Perform Discord sync
      const syncResult = await discordService.syncUserRoles(
        user.discordId,
        user.userRoles.map((ur) => ur.role.name),
      );

      // Log the action
      await activityService.logActivity({
        actorId: adminId,
        actorType: "USER",
        actionType: "DISCORD_SYNC_FORCED",
        entityType: "USER",
        entityId: userId,
        details: {
          reason,
          syncSuccess: syncResult.success,
          syncError: syncResult.error,
          targetUser: {
            discordId: user.discordId,
            discordUsername: user.discordUsername,
          },
        },
      });

      return {
        success: syncResult.success,
        data: syncResult.data,
        error: syncResult.error,
      };
    } catch (error) {
      logger.error("Failed to force sync user:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to force sync user",
      };
    }
  }
}

export const userService = new UserService();
