import { Prisma } from "@prisma/client";
import { RoleActionData } from "../schemas/role.validation";

export type RoleWithUserRoles = Prisma.RoleGetPayload<{
  include: {
    userRoles: {
      where: { revokedAt: null };
      include: {
        user: {
          select: {
            id: true;
            discordUsername: true;
          };
        };
      };
    };
  };
}>;

interface BaseRoleActionResult {
  success: boolean;
  skippedRoles: string[];
  error?: string;
}

export type ApplyRoleOptions = RoleActionData & {
  grantedBy?: string;
};

export interface ApplyRoleResult extends BaseRoleActionResult {
  appliedRoles: string[];
}

export type RemoveRoleOptions = RoleActionData & {
  revokedBy?: string;
};

export interface RemoveRoleResult extends BaseRoleActionResult {
  revokedRoles: string[];
}
