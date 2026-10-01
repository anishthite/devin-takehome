type Env = Record<string, string | undefined>;

export interface SqlConnectionConfig {
  connectionString: string;
  /** `require` verifies the server certificate; `no-verify` encrypts without verifying; `disable` is plain TCP. */
  ssl: "require" | "no-verify" | "disable";
  maxConnections: number;
  statementTimeoutMs: number;
  applicationName: string;
}

export function isSqlConfigured(env: Env = process.env): boolean {
  return Boolean(env.DATABASE_URL);
}

function positiveInt(env: Env, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error(`${name} must be a positive integer`);
  return n;
}

export function readSqlConfig(env: Env = process.env): SqlConnectionConfig {
  const connectionString = env.DATABASE_URL;
  if (!connectionString) throw new Error("Missing required environment variable DATABASE_URL");
  const url = new URL(connectionString);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must be a postgres:// connection string");
  }
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
  const ssl = env.DATABASE_SSL ?? (local ? "disable" : "require");
  if (ssl !== "require" && ssl !== "no-verify" && ssl !== "disable") {
    throw new Error("DATABASE_SSL must be require, no-verify or disable");
  }
  if (ssl === "disable" && !local && env.NODE_ENV === "production") {
    throw new Error("DATABASE_SSL=disable is only allowed for local databases in production");
  }
  return {
    connectionString,
    ssl,
    maxConnections: positiveInt(env, "DATABASE_POOL_MAX", 10),
    statementTimeoutMs: positiveInt(env, "DATABASE_STATEMENT_TIMEOUT_MS", 10_000),
    applicationName: env.DATABASE_APPLICATION_NAME || "kit",
  };
}
