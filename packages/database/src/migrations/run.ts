import {
  ensureMigrationTable,
  getAppliedMigrations,
  recordMigration,
  removeMigration,
} from "./migration-table";

import { createLogger } from "@workspace/utils/logger";
import { db } from "../utils/db-client";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";

const logger = createLogger("migrations");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.join(__dirname, "../../sql");

async function loadMigrationFiles(): Promise<
  { name: string; content: string }[]
> {
  const files = await fs.promises.readdir(sqlDir);
  const migrationFiles = files.filter((file) => file.endsWith(".sql"));

  return Promise.all(
    migrationFiles.map(async (file) => {
      const content = await fs.promises.readFile(
        path.join(sqlDir, file),
        "utf8",
      );
      return { name: file, content };
    }),
  ).then((migrations) =>
    migrations.sort((a, b) => a.name.localeCompare(b.name)),
  );
}

function extractMigrations(content: string): { up: string; down: string } {
  const downSeparator = "--@DOWN";
  if (content.includes(downSeparator)) {
    const [up, down] = content.split(downSeparator);
    if (!down) {
      throw new Error("Down migration is empty");
    }
    if (!up) {
      throw new Error("Up migration is empty");
    }
    return { up: up.trim(), down: down.trim() };
  }

  return { up: content.trim(), down: "" };
}

async function migrateUp(): Promise<void> {
  await ensureMigrationTable();
  const appliedMigrations = await getAppliedMigrations();
  const migrations = await loadMigrationFiles();

  const pendingMigrations = migrations.filter(
    (m) => !appliedMigrations.includes(m.name),
  );

  if (pendingMigrations.length === 0) {
    logger.info("No pending migrations");
    return;
  }

  for (const migration of pendingMigrations) {
    logger.info(`Applying migration: ${migration.name}`);
    const { up } = extractMigrations(migration.content);

    await db.transaction(async (client) => {
      await client.query(up);
      await recordMigration(migration.name);
    });

    logger.info(`Successfully applied migration: ${migration.name}`);
  }
}

async function migrateDown(steps = 1): Promise<void> {
  await ensureMigrationTable();
  const appliedMigrations = await getAppliedMigrations();
  const migrations = await loadMigrationFiles();

  // Filter and sort migrations that have been applied
  const appliedMigrationFiles = migrations
    .filter((m) => appliedMigrations.includes(m.name))
    .reverse() // Latest first
    .slice(0, steps);

  if (appliedMigrationFiles.length === 0) {
    logger.info("No migrations to roll back");
    return;
  }

  for (const migration of appliedMigrationFiles) {
    logger.info(`Rolling back migration: ${migration.name}`);
    const { down } = extractMigrations(migration.content);

    if (!down) {
      logger.warn(`No down migration for ${migration.name}, skipping`);
      continue;
    }

    await db.transaction(async (client) => {
      await client.query(down);
      await removeMigration(migration.name);
    });

    logger.info(`Successfully rolled back migration: ${migration.name}`);
  }
}

// Main execution
async function main() {
  const command = process.argv[2] || "up";
  const steps = parseInt(process.argv[3] || "1", 10);

  try {
    if (command === "up") {
      await migrateUp();
    } else if (command === "down") {
      await migrateDown(steps);
    } else {
      logger.error(`Unknown command: ${command}. Use 'up' or 'down'.`);
      process.exit(1);
    }

    await db.end();
    process.exit(0);
  } catch (error) {
    logger.error("Migration failed", { error: (error as Error).message });
    await db.end();
    process.exit(1);
  }
}

main();
