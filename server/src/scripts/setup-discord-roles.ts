import { createLogger } from "@/utils/logger";
import { discordService } from "../services/discord-service";

const logger = createLogger("setup-script");

async function setupDiscordRoles() {
  try {
    logger.info("Starting Discord roles setup...");

    const roleIds = await discordService.setupGuildRoles();

    logger.info("Discord roles setup completed!", { roleIds });

    console.log("\n✅ Discord roles setup completed!");
    console.log("Created/verified roles:");

    Object.entries(roleIds).forEach(([role, id]) => {
      console.log(`  ${role}: ${id || "Failed to create"}`);
    });

    process.exit(0);
  } catch (error) {
    logger.error("Failed to setup Discord roles", { error });
    console.error("❌ Failed to setup Discord roles:", error);
    process.exit(1);
  }
}

setupDiscordRoles();
