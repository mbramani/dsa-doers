import {
  assignNewbieRoleToAllUsers,
  cleanupDefaultRoles,
  createDefaultRoles,
} from "./default-roles";

import { prisma } from "../services/database.service";
import prompts from "prompts";
import { roleService } from "../services/role.service";

// Interactive CLI using prompts
async function runInteractiveCLI() {
  console.log("🎯 DSA Doers Role Management Tool\n");

  while (true) {
    try {
      const { action } = await prompts({
        type: "select",
        name: "action",
        message: "What would you like to do?",
        choices: [
          { title: "➕ Apply roles to user", value: "apply" },
          { title: "➖ Remove roles from user", value: "remove" },
          {
            title: "👶 Assign NEWBIE role to all users without roles",
            value: "assign-newbie",
          },
          { title: "👥 List users and their roles", value: "list-users" },
          { title: "🏷️  List all available roles", value: "list-roles" },
          { title: "🏗️  Create default roles", value: "create-default-roles" },
          { title: "🧹 Cleanup default roles", value: "cleanup-default-roles" },
          { title: "❌ Exit", value: "exit" },
        ],
      });

      if (!action || action === "exit") {
        console.log("👋 Goodbye!");
        break;
      }

      await handleAction(action);

      // Ask if user wants to continue
      const { continue: shouldContinue } = await prompts({
        type: "confirm",
        name: "continue",
        message: "Do you want to perform another action?",
        initial: true,
      });

      if (!shouldContinue) {
        console.log("👋 Goodbye!");
        break;
      }
    } catch (error: any) {
      if (error.message === "cancelled") {
        console.log("\n👋 Operation cancelled. Goodbye!");
        break;
      }
      console.error("❌ An error occurred:", error.message);
    }
  }
}

async function handleAction(action: string) {
  switch (action) {
    case "apply":
      await handleApplyRoles();
      break;
    case "remove":
      await handleRemoveRoles();
      break;
    case "assign-newbie":
      await handleAssignNewbie();
      break;
    case "list-users":
      await handleListUsers();
      break;
    case "list-roles":
      await handleListRoles();
      break;
    case "create-default-roles":
      await handleCreateDefaultRoles();
      break;
    case "cleanup-default-roles":
      await handleCleanupDefaultRoles();
      break;
  }
}

async function handleApplyRoles() {
  const { userId } = await prompts({
    type: "text",
    name: "userId",
    message: "Enter user ID:",
    validate: (value) => value.length > 0 || "User ID is required",
  });

  // Get available roles for selection
  const availableRoles = await prisma.role.findMany({
    where: { isArchived: false },
    orderBy: { sortOrder: "asc" },
  });

  const { roleNames } = await prompts({
    type: "multiselect",
    name: "roleNames",
    message: "Select roles to apply:",
    choices: availableRoles.map((role) => ({
      title: `${role.isSystemRole ? "🔧" : "👤"} ${role.name} - ${role.description}`,
      value: role.name,
    })),
    min: 1,
  });

  const { reason } = await prompts({
    type: "text",
    name: "reason",
    message: "Reason for role assignment (optional):",
    initial: "Manual role assignment via interactive script",
  });

  const { syncWithDiscord } = await prompts({
    type: "confirm",
    name: "syncWithDiscord",
    message: "Sync with Discord?",
    initial: true,
  });

  console.log("\n🔄 Applying roles...");

  try {
    const result = await roleService.applyRoleToUser({
      userId,
      roleNames,
      reason,
      syncWithDiscord,
    });

    if (result.success) {
      console.log(
        `✅ Successfully applied roles [${result.appliedRoles.join(", ")}] to user ${userId}`,
      );
      if (result.skippedRoles.length > 0) {
        console.log(
          `ℹ️  Skipped roles [${result.skippedRoles.join(", ")}] - user already has them`,
        );
      }
    } else {
      console.error(`❌ Failed to apply roles: ${result.error}`);
    }
  } catch (error: any) {
    console.error("❌ Failed to apply roles:", error.message);
  }
}

async function handleRemoveRoles() {
  const { userId } = await prompts({
    type: "text",
    name: "userId",
    message: "Enter user ID:",
    validate: (value) => value.length > 0 || "User ID is required",
  });

  // Get user's current roles
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
    console.error("❌ User not found");
    return;
  }

  if (user.userRoles.length === 0) {
    console.log("ℹ️  User has no active roles to remove");
    return;
  }

  const { roleNames } = await prompts({
    type: "multiselect",
    name: "roleNames",
    message: "Select roles to remove:",
    choices: user.userRoles.map((ur) => ({
      title: `${ur.role.isSystemRole ? "🔧" : "👤"} ${ur.role.name} - ${ur.role.description}`,
      value: ur.role.name,
    })),
    min: 1,
  });

  const { reason } = await prompts({
    type: "text",
    name: "reason",
    message: "Reason for role removal (optional):",
    initial: "Manual role removal via interactive script",
  });

  const { syncWithDiscord } = await prompts({
    type: "confirm",
    name: "syncWithDiscord",
    message: "Sync with Discord?",
    initial: true,
  });

  console.log("\n🔄 Removing roles...");

  try {
    const result = await roleService.removeRoleFromUser({
      userId,
      roleNames,
      reason,
      syncWithDiscord,
    });

    if (result.success) {
      console.log(
        `✅ Successfully removed roles [${result.revokedRoles.join(", ")}] from user ${userId}`,
      );
      if (result.skippedRoles.length > 0) {
        console.log(
          `ℹ️  Skipped roles [${result.skippedRoles.join(", ")}] - user doesn't have them`,
        );
      }
    } else {
      console.error(`❌ Failed to remove roles: ${result.error}`);
    }
  } catch (error: any) {
    console.error("❌ Failed to remove roles:", error.message);
  }
}

async function handleAssignNewbie() {
  const { confirm } = await prompts({
    type: "confirm",
    name: "confirm",
    message:
      "This will assign NEWBIE role to all users without any roles. Continue?",
    initial: false,
  });

  if (!confirm) {
    console.log("ℹ️  Operation cancelled");
    return;
  }

  console.log("\n🔄 Processing newbie role assignments...");

  try {
    await assignNewbieRoleToAllUsers();
    console.log("✅ Successfully processed newbie role assignments");
  } catch (error: any) {
    console.error("❌ Failed to assign newbie roles:", error.message);
  }
}

async function handleListUsers() {
  console.log("\n🔄 Fetching users...");

  try {
    const users = await prisma.user.findMany({
      where: { isArchived: false },
      include: {
        userRoles: {
          where: { revokedAt: null },
          include: { role: true },
        },
      },
      take: 20,
    });

    console.log("\n📋 Users in the system:");
    users.forEach((user) => {
      const roles =
        user.userRoles.map((ur) => ur.role.name).join(", ") || "No roles";
      console.log(`   ${user.id} - ${user.discordUsername} (${roles})`);
    });

    if (users.length === 20) {
      console.log("\nℹ️  Showing first 20 users only");
    }
  } catch (error: any) {
    console.error("❌ Failed to list users:", error.message);
  }
}

async function handleListRoles() {
  console.log("\n🔄 Fetching roles...");

  try {
    const roles = await prisma.role.findMany({
      where: { isArchived: false },
      orderBy: { sortOrder: "asc" },
    });

    console.log("\n📋 Available roles:");
    roles.forEach((role) => {
      const systemBadge = role.isSystemRole ? "🔧" : "👤";
      console.log(
        `   ${systemBadge} ${role.name} - ${role.description} (Sort: ${role.sortOrder})`,
      );
    });
  } catch (error: any) {
    console.error("❌ Failed to list roles:", error.message);
  }
}

async function handleCreateDefaultRoles() {
  const { confirm } = await prompts({
    type: "confirm",
    name: "confirm",
    message: "This will create default roles for the system. Continue?",
    initial: false,
  });

  if (!confirm) {
    console.log("ℹ️  Operation cancelled");
    return;
  }

  console.log("\n🏗️  Creating default roles...");

  try {
    await createDefaultRoles();

    console.log("✅ Default roles created successfully");
  } catch (error: any) {
    console.error("❌ Failed to create default roles:", error.message);
  }
}

async function handleCleanupDefaultRoles() {
  const { confirm } = await prompts({
    type: "confirm",
    name: "confirm",
    message: "This will remove all default roles from the system. Continue?",
    initial: false,
  });

  if (!confirm) {
    console.log("ℹ️  Operation cancelled");
    return;
  }

  console.log("\n🧹 Cleaning up default roles...");

  try {
    await cleanupDefaultRoles();

    console.log("✅ Default roles cleaned up successfully:");
  } catch (error: any) {
    console.error("❌ Failed to clean up default roles:", error.message);
  }
}

// Main execution
if (require.main === module) {
  runInteractiveCLI()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Application error:", error);
      process.exit(1);
    });
}
