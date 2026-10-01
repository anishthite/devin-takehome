/**
 * Typed connector to an external SQL database (Postgres dialect: `$1` placeholders).
 * Implementations: `postgresClient` (live, `pg` pool) and `createMockSqlClient` (in-memory, demo/tests).
 */

export type SqlValue = string | number | boolean | null | Date;

export interface SqlResult<Row> {
  rows: Row[];
  rowCount: number;
}

export interface SqlExecutor {
  query<Row extends object = Record<string, unknown>>(text: string, params?: readonly SqlValue[]): Promise<SqlResult<Row>>;
}

export interface SqlClient extends SqlExecutor {
  readonly dialect: "postgres";
  /**
   * Runs `fn` in one transaction: commits when it resolves, rolls back when it throws.
   * Every `query` made while `fn` runs (on this client, from any module) joins the transaction,
   * and nested `transaction` calls join the outer one.
   */
  transaction<T>(fn: () => Promise<T>): Promise<T>;
  /** Cheap connectivity check for health endpoints. */
  ping(): Promise<void>;
  close(): Promise<void>;
}

export interface SqlMigration {
  /** Unique and stable, e.g. `kit_001_audit_log`; migrations run in array order. */
  id: string;
  sql: string;
}

/** Postgres SQLSTATE codes the kit cares about. */
export const SQLSTATE = {
  uniqueViolation: "23505",
  checkViolation: "23514",
  serializationFailure: "40001",
  deadlockDetected: "40P01",
} as const;

export function sqlState(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : undefined;
}

export function isUniqueViolation(error: unknown): boolean {
  return sqlState(error) === SQLSTATE.uniqueViolation;
}

/** Reads a bigint/numeric column as a safe integer; `pg` returns int8 as a string. */
export function toSafeInteger(value: unknown, column: string): number {
  const n = typeof value === "number" ? value : typeof value === "string" || typeof value === "bigint" ? Number(value) : NaN;
  if (!Number.isSafeInteger(n)) throw new Error(`Column ${column} is not a safe integer`);
  return n;
}

export function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  throw new Error("Expected a timestamp");
}
