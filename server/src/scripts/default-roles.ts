import { ApplyRoleOptions } from "../types/role";
import { RoleData } from "../schemas/role.validation";
import { discordService } from "../services/discord.service";
import { logger } from "../utils/logger";
import { prisma } from "../services/database.service";
import { roleService } from "../services/role.service";

const defaultRoles: RoleData[] = [
  {
    name: "ADMIN",
    description: "Platform administrators with full access",
    color: "#FF0000",
    sortOrder: 0,
    isSystemRole: true,
    discordRoleConfig: {
      permissions: ["ADMINISTRATOR"],
      hoist: true,
      mentionable: false,
    },
  },
  {
    name: "MODERATOR",
    description: "Community moderators who conduct final reviews",
    color: "#FF8C00",
    sortOrder: 0,
    isSystemRole: true,
    discordRoleConfig: {
      permissions: [
        "MANAGE_MESSAGES",
        "MANAGE_CHANNELS",
        "KICK_MEMBERS",
        "MUTE_MEMBERS",
      ],
      hoist: true,
      mentionable: true,
    },
  },
  {
    name: "MEMBER",
    description: "Active community members with full platform access",
    color: "#00FF00",
    sortOrder: 0,
    isSystemRole: true,
    discordRoleConfig: {
      permissions: ["SEND_MESSAGES", "CONNECT", "SPEAK"],
      hoist: false,
      mentionable: true,
    },
  },
  {
    name: "NEWBIE",
    description: "New users starting their DSA journey",
    color: "#87CEEB",
    sortOrder: 0,
    isSystemRole: true,
    discordRoleConfig: {
      permissions: ["SEND_MESSAGES", "CONNECT"],
      hoist: false,
      mentionable: true,
    },
  },
  {
    name: "REVIEWER",
    description: "Users qualified to review peer submissions",
    color: "#9370DB",
    sortOrder: 1,
    isSystemRole: false,
    discordRoleConfig: {
      permissions: ["SEND_MESSAGES", "CONNECT", "SPEAK"],
      hoist: false,
      mentionable: true,
    },
  },
  {
    name: "MENTOR",
    description: "Experienced members who guide others",
    color: "#FFD700",
    sortOrder: 1,
    isSystemRole: false,
    discordRoleConfig: {
      permissions: ["SEND_MESSAGES", "CONNECT", "SPEAK", "PRIORITY_SPEAKER"],
      hoist: true,
      mentionable: true,
    },
  },
  {
    name: "EXPERT",
    description: "Advanced users with deep DSA knowledge",
    color: "#8A2BE2",
    sortOrder: 1,
    isSystemRole: false,
    discordRoleConfig: {
      permissions: ["SEND_MESSAGES", "CONNECT", "SPEAK", "PRIORITY_SPEAKER"],
      hoist: true,
      mentionable: true,
    },
  },
];

export async function createDefaultRoles(): Promise<void> {
  try {
    logger.info("Starting default roles creation...");

    // Check if Discord service is ready
    if (!discordService.isReady()) {
      await discordService.initialize();
    }

    for (const roleData of defaultRoles) {
      // Use the role service to create the role
      const result = await roleService.createRole(
        roleData,
        "system_setup_script",
      );

      if (result.success) {
        const createdRole = result.data!;
        logger.info(
          `Created role: ${roleData.name} with ID: ${createdRole.id}${createdRole.discordRoleId ? ` (Discord: ${createdRole.discordRoleId})` : ""}`,
        );
        continue;
      }

      // Check if it's a duplicate role error (expected behavior)
      if (result.error?.includes("already exists")) {
        logger.info(`Role ${roleData.name} already exists, skipping...`);
        continue;
      }

      // For other errors, log and throw
      logger.error(`Failed to create role ${roleData.name}:`, result.error);

      // Additional script-specific logging
      await prisma.activityLog.create({
        data: {
          actorType: "SYSTEM",
          actionType: "ROLE_CREATION_FAILED",
          entityType: "ROLE",
          details: {
            roleName: roleData.name,
            error: result.error,
            createdBy: "system_setup_script",
            context: "default_roles_script",
          },
        },
      });

      throw new Error(
        `Failed to create role ${roleData.name}: ${result.error}`,
      );
    }

    logger.info("Default roles creation completed successfully");
  } catch (error) {
    logger.error("Failed to create default roles:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export async function cleanupDefaultRoles(): Promise<void> {
  try {
    logger.info("Starting role cleanup...");

    const rolesToCleanup = defaultRoles.map((r) => r.name);

    // Get roles from database
    const existingRoles = await prisma.role.findMany({
      where: {
        name: { in: rolesToCleanup },
        isArchived: false,
      },
    });

    for (const role of existingRoles) {
      const result = await roleService.deleteRole(role.id, "cleanup_script");

      if (result.success) {
        logger.info(`Deleted role: ${role.name}`);
      } else {
        logger.error(`Failed to delete role ${role.name}:`, result.error);
        // Continue with other roles instead of throwing
      }
    }

    logger.info("Role cleanup completed");
  } catch (error) {
    logger.error("Failed to cleanup roles:", error);
    throw error;
  }
}

export async function assignNewbieRoleToAllUsers(): Promise<void> {
  try {
    logger.info("Starting newbie role assignment for all users without roles");

    // Get users without any active roles
    const usersWithoutRoles = await prisma.user.findMany({
      where: {
        isArchived: false,
        userRoles: {
          none: {
            revokedAt: null,
          },
        },
      },
      select: {
        id: true,
        discordUsername: true,
      },
    });

    if (usersWithoutRoles.length === 0) {
      logger.info("No users found without roles");
      console.log("ℹ️  No users found without roles");
      return;
    }

    console.log(
      `📝 Assigning NEWBIE role to ${usersWithoutRoles.length} users...`,
    );

    // Use the service's bulk assignment method
    const assignments: ApplyRoleOptions[] = usersWithoutRoles.map((user) => ({
      userId: user.id,
      roleNames: ["NEWBIE"],
      reason: "Default role assignment for new users",
      syncWithDiscord: true,
    }));

    const result = await roleService.bulkApplyRoles(assignments);

    if (!result.success) {
      throw new Error(result.error || "Bulk assignment failed");
    }

    // Destructure data with non-null assertion and rename to avoid shadowing
    const { success: successCount, failed, errors } = result.data!;
    console.log(`✅ Successfully assigned roles to ${successCount} users`);

    if (failed > 0) {
      console.log(`❌ Failed to assign roles to ${failed} users`);
      errors.forEach((err) => {
        console.log(`   - User ${err.userId}: ${err.error}`);
      });
    }

    logger.info("Newbie role assignment completed", result.data);
  } catch (error) {
    logger.error("Failed to assign newbie roles:", error);
    throw error;
  }
}
