import { db } from "../utils/db-client";

export async function ensureMigrationTable(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `);
}

export async function getAppliedMigrations(): Promise<string[]> {
  await ensureMigrationTable();

  const result = await db.query<{ name: string }>(`
    SELECT name FROM migrations ORDER BY id ASC;
  `);

  return result.rows.map((row) => row.name);
}

export async function recordMigration(name: string): Promise<void> {
  await db.query(
    `
    INSERT INTO migrations (name) VALUES ($1);
  `,
    [name],
  );
}

export async function removeMigration(name: string): Promise<void> {
  await db.query(
    `
    DELETE FROM migrations WHERE name = $1;
  `,
    [name],
  );
}
