import { isDemoMode } from "@kit/demo/mode";
import { getKitServices } from "@kit/services/services";
import { createMockSqlClient } from "@kit/sql/mock";
import { runMigrations } from "@kit/sql/migrate";
import type { SqlClient } from "@kit/sql/client";
import { sqlCustomerAccounts } from "./accounts";
import { ADJUSTMENT_MIGRATIONS } from "./migrations";
import { seedDemoAccounts, seedDemoRequests } from "./seed";
import { createAdjustmentService, type AdjustmentService } from "./service";

export interface AdjustmentsRuntime {
  service: AdjustmentService;
  sql: SqlClient;
  database: "postgres" | "mock";
}

/**
 * DATABASE_URL set: the external Postgres (schema via `npm run db:migrate`), shared with the kit's audit_log and approvals.
 * Otherwise only in DEMO_MODE: an in-memory pg-mem database seeded with sample customers.
 */
async function build(): Promise<AdjustmentsRuntime> {
  const kit = await getKitServices();
  if (kit.sql) {
    return { sql: kit.sql, database: "postgres", service: service(kit.sql, kit) };
  }
  if (!isDemoMode()) throw new Error("Missing required environment variable DATABASE_URL");

  const { client: sql } = createMockSqlClient();
  await runMigrations(sql, ADJUSTMENT_MIGRATIONS);
  await seedDemoAccounts(sql);
  const adjustments = service(sql, kit);
  await seedDemoRequests(adjustments);
  return { sql, database: "mock", service: adjustments };
}

function service(sql: SqlClient, kit: Awaited<ReturnType<typeof getKitServices>>) {
  return createAdjustmentService({
    accounts: sqlCustomerAccounts(sql),
    approvals: kit.approvals,
    auditLog: kit.auditLog,
    transaction: sql.transaction,
  });
}

const store = globalThis as typeof globalThis & { __adjustmentsRuntime?: Promise<AdjustmentsRuntime> };

export function getAdjustments(): Promise<AdjustmentsRuntime> {
  store.__adjustmentsRuntime ??= build().catch((error: unknown) => {
    store.__adjustmentsRuntime = undefined;
    throw error;
  });
  return store.__adjustmentsRuntime;
}
