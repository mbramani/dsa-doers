import { config } from "dotenv";
import { createLogger } from "@workspace/utils/logger";
import pg from "pg";

config();

const { Pool } = pg;

const logger = createLogger("db-client");

class DatabaseClient {
  private pool: pg.Pool;
  private static instance: DatabaseClient;

  private constructor() {
    const config: pg.PoolConfig = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl:
        process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_SIZE || "10"),
      idleTimeoutMillis: 30000,
    };

    this.pool = new Pool(config);

    this.pool.on("connect", () => {
      logger.info("Database connection established");
    });

    this.pool.on("error", (err) => {
      logger.error("Unexpected error on idle client", { error: err.message });
    });
  }

  public static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  public async query<T extends pg.QueryResultRow = any>(
    text: string,
    params?: any[],
  ): Promise<pg.QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;

      logger.debug("Executed query", {
        text,
        duration,
        rows: result.rowCount,
      });

      return result;
    } catch (error) {
      logger.error("Query failed", {
        text,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  public async getClient(): Promise<pg.PoolClient> {
    const client = await this.pool.connect();
    const originalQuery = client.query.bind(client);
    const originalRelease = client.release.bind(client);

    // Type-safe query override
    const query = async function <T extends pg.QueryResultRow = any>(
      this: pg.PoolClient,
      textOrConfig: string | object,
      params?: any[],
    ): Promise<pg.QueryResult<T>> {
      const start = Date.now();
      try {
        const result = await originalQuery(textOrConfig as any, params);
        const duration = Date.now() - start;
        const queryText =
          typeof textOrConfig === "string"
            ? textOrConfig
            : (textOrConfig as any).text || "complex query";

        logger.debug("Client executed query", {
          query: queryText,
          duration,
          rows: result.rowCount,
        });

        return result as unknown as pg.QueryResult<T>;
      } catch (error) {
        const queryText =
          typeof textOrConfig === "string"
            ? textOrConfig
            : (textOrConfig as any).text || "complex query";

        logger.error("Client query failed", {
          query: queryText,
          error: (error as Error).message,
        });
        throw error;
      }
    };

    // Override query method
    client.query = query as any;

    // Override release method
    client.release = () => {
      client.query = originalQuery;
      originalRelease();
      logger.debug("Client released back to pool");
    };

    return client;
  }

  public async transaction<T>(
    callback: (client: pg.PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.getClient();

    try {
      await client.query("BEGIN");
      logger.debug("Transaction started");

      const result = await callback(client);

      await client.query("COMMIT");
      logger.debug("Transaction committed successfully");

      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch((rollbackError) => {
        logger.error("Error during transaction rollback", {
          error: rollbackError.message,
        });
      });

      logger.error("Transaction rolled back due to error", {
        error: (error as Error).message,
      });

      throw error;
    } finally {
      client.release();
    }
  }

  public async end(): Promise<void> {
    await this.pool.end();
    logger.info("Database connection pool has ended");
  }

  public async health(): Promise<boolean> {
    try {
      const result = await this.query("SELECT 1 AS health");
      return result.rows[0].health === 1;
    } catch (error) {
      logger.error("Database health check failed", {
        error: (error as Error).message,
      });
      return false;
    }
  }
}

export const db = DatabaseClient.getInstance();