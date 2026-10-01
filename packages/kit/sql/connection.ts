import type { SqlClient } from "./client.ts";
import { isSqlConfigured, readSqlConfig } from "./config.ts";
import { postgresClient } from "./postgres.ts";

const store = globalThis as typeof globalThis & { __kitSqlClient?: SqlClient };

/**
 * Process-wide client for DATABASE_URL. Kit services and the app must share it so that
 * `transaction()` spans both (e.g. approving a request and posting the money movement it authorizes).
 */
export function getSqlClient(): SqlClient | null {
  if (!isSqlConfigured()) return null;
  store.__kitSqlClient ??= postgresClient(readSqlConfig());
  return store.__kitSqlClient;
}
