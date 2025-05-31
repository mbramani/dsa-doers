import {
  ActivityLogData,
  ActivityLogFilters,
  ActivityStats,
} from "../types/activity";

import { Prisma } from "@prisma/client";
import { ServiceResult } from "../types/service";
import { logger } from "../utils/logger";
import { prisma } from "./database.service";

export type ActivityLogWithActor = Prisma.ActivityLogGetPayload<{
  include: {
    actor: {
      select: {
        id: true;
        discordUsername: true;
        discordAvatar: true;
      };
    };
  };
}>;

export class ActivityService {
  public async logActivity(data: ActivityLogData): Promise<boolean> {
    try {
      await prisma.activityLog.create({
        data: {
          actorId: data.actorId || null,
          actorType: data.actorType || "USER",
          actionType: data.actionType,
          entityType: data.entityType,
          entityId: data.entityId || null,
          details: data.details || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
        },
      });

      logger.info("Activity logged", {
        actionType: data.actionType,
        entityType: data.entityType,
        actorId: data.actorId,
      });

      return true;
    } catch (error) {
      logger.error("Failed to log activity:", error, { activityData: data });
      // Don't throw - activity logging should not break main functionality
      return false;
    }
  }

  public async getActivityLogs(
    filters: ActivityLogFilters,
  ): Promise<ServiceResult<ActivityLogWithActor[]>> {
    try {
      const where: any = {};

      if (filters.actorId) where.actorId = filters.actorId;
      if (filters.actionType) where.actionType = filters.actionType;
      if (filters.entityType) where.entityType = filters.entityType;

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      const logs = await prisma.activityLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              discordUsername: true,
              discordAvatar: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      });

      return {
        success: true,
        data: logs,
      };
    } catch (error) {
      logger.error("Failed to get activity logs:", error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve activity logs",
      };
    }
  }

  public async getActivityStats(
    timeframe: "day" | "week" | "month" = "week",
  ): Promise<ServiceResult<ActivityStats[]>> {
    try {
      const now = new Date();
      const startDate = new Date();

      switch (timeframe) {
        case "day":
          startDate.setDate(now.getDate() - 1);
          break;
        case "week":
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      const activityCounts = await prisma.activityLog.groupBy({
        by: ["actionType"],
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        _count: {
          id: true,
        },
      });

      const stats: ActivityStats[] = activityCounts.map((item) => ({
        actionType: item.actionType,
        count: item._count.id,
      }));

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      logger.error("Failed to get activity stats:", error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve activity statistics",
      };
    }
  }
}

export const activityService = new ActivityService();
