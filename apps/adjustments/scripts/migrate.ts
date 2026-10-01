// Applies the kit and app schema to DATABASE_URL. `--seed` also loads the sample customers (non-production only).
import { KIT_SQL_MIGRATIONS } from "../../../packages/kit/sql/migrations.ts";
import { runMigrations } from "../../../packages/kit/sql/migrate.ts";
import { postgresClient } from "../../../packages/kit/sql/postgres.ts";
import { readSqlConfig } from "../../../packages/kit/sql/config.ts";
import { ADJUSTMENT_MIGRATIONS } from "../src/lib/adjustments/migrations.ts";
import { seedDemoAccounts } from "../src/lib/adjustments/seed.ts";

const seed = process.argv.includes("--seed");
if (seed && process.env.NODE_ENV === "production") throw new Error("--seed is not allowed in production");

const sql = postgresClient(readSqlConfig());
try {
  const applied = await runMigrations(sql, [...KIT_SQL_MIGRATIONS, ...ADJUSTMENT_MIGRATIONS]);
  console.log(applied.length ? `Applied ${applied.join(", ")}` : "Schema is up to date");
  if (seed) {
    await seedDemoAccounts(sql);
    console.log("Seeded sample customer accounts");
  }
} finally {
  await sql.close();
}
