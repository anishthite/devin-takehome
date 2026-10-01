import type { SqlMigration } from "./client.ts";

/** Tables backing the kit's audit_log and approval store when DATABASE_URL is set. */
export const KIT_SQL_MIGRATIONS: readonly SqlMigration[] = [
  {
    id: "kit_001_audit_log",
    sql: `
      CREATE TABLE kit_audit_log (
        seq bigserial UNIQUE,
        id text PRIMARY KEY,
        occurred_at timestamptz NOT NULL,
        actor_id text NOT NULL,
        actor_name text NOT NULL,
        action text NOT NULL,
        target_type text NOT NULL,
        target_id text NOT NULL,
        changes jsonb NOT NULL
      );
      CREATE INDEX kit_audit_log_target ON kit_audit_log (target_type, target_id);
    `,
  },
  {
    id: "kit_002_approval_requests",
    sql: `
      CREATE TABLE kit_approval_requests (
        id text PRIMARY KEY,
        kind text NOT NULL,
        status text NOT NULL,
        requested_at timestamptz NOT NULL,
        record jsonb NOT NULL
      );
      CREATE INDEX kit_approval_requests_kind ON kit_approval_requests (kind, requested_at);
    `,
  },
];
