import { AsyncLocalStorage } from "node:async_hooks";
import pg from "pg";
import { SQLSTATE, sqlState, type SqlClient, type SqlExecutor, type SqlValue } from "./client.ts";
import type { SqlConnectionConfig } from "./config.ts";

const INT8_OID = 20;

/** int8 → number, refusing values that would lose precision. */
const types = {
  getTypeParser(oid: number, format?: "text" | "binary") {
    if (oid === INT8_OID && format !== "binary") {
      return (value: string) => {
        const n = Number(value);
        if (!Number.isSafeInteger(n)) throw new Error(`int8 value ${value} exceeds Number.MAX_SAFE_INTEGER`);
        return n;
      };
    }
    return pg.types.getTypeParser(oid, format as "text");
  },
};

type Queryable = Pick<pg.Pool, "query">;

export interface PostgresClientOptions {
  /** Retries for serialization failures / deadlocks before giving up. */
  maxTransactionRetries?: number;
}

/** Wraps a `pg` pool (or anything with the same `query`/`connect`, such as pg-mem's adapter). */
export function postgresClientFromPool(
  pool: pg.Pool,
  { maxTransactionRetries = 2 }: PostgresClientOptions = {},
): SqlClient {
  const current = new AsyncLocalStorage<pg.PoolClient>();

  const target = (): Queryable => current.getStore() ?? pool;

  const executor: SqlExecutor = {
    async query<Row extends object>(text: string, params: readonly SqlValue[] = []) {
      const result = await target().query<Row & pg.QueryResultRow>(text, params as unknown[]);
      return { rows: result.rows as Row[], rowCount: result.rowCount ?? 0 };
    },
  };

  async function attempt<T>(fn: () => Promise<T>): Promise<T> {
    const connection = await pool.connect();
    let broken = false;
    try {
      await connection.query("BEGIN");
      const result = await current.run(connection, fn);
      await connection.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await connection.query("ROLLBACK");
      } catch {
        broken = true;
      }
      throw error;
    } finally {
      connection.release(broken);
    }
  }

  return {
    dialect: "postgres",
    query: executor.query,
    async transaction(fn) {
      if (current.getStore()) return fn();
      for (let retry = 0; ; retry++) {
        try {
          return await attempt(fn);
        } catch (error) {
          const code = sqlState(error);
          const retryable = code === SQLSTATE.serializationFailure || code === SQLSTATE.deadlockDetected;
          if (!retryable || retry >= maxTransactionRetries) throw error;
        }
      }
    },
    async ping() {
      await executor.query("SELECT 1");
    },
    close: () => pool.end(),
  };
}

export function postgresClient(config: SqlConnectionConfig, options?: PostgresClientOptions): SqlClient {
  const pool = new pg.Pool({
    connectionString: config.connectionString,
    ssl: config.ssl === "disable" ? false : { rejectUnauthorized: config.ssl === "require" },
    max: config.maxConnections,
    statement_timeout: config.statementTimeoutMs,
    query_timeout: config.statementTimeoutMs + 1_000,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    application_name: config.applicationName,
    types,
  });
  // Idle clients can error (e.g. server restart); without a listener that would crash the process.
  pool.on("error", (error) => console.error("[kit/sql] idle client error:", error.message));
  return postgresClientFromPool(pool, options);
}
