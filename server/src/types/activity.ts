export interface ActivityLogData {
  actorId?: string;
  actorType?: "USER" | "SYSTEM";
  actionType: string;
  entityType: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface ActivityLogFilters {
  actorId?: string;
  actionType?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ActivityStats {
  actionType: string;
  count: number;
}
