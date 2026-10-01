import type { SqlClient, SqlMigration } from "./client.ts";

const TABLE = "kit_schema_migrations";

/** Applies pending migrations in order, each in its own transaction. Returns the ids it applied. */
export async function runMigrations(client: SqlClient, migrations: readonly SqlMigration[]): Promise<string[]> {
  const ids = new Set<string>();
  for (const m of migrations) {
    if (ids.has(m.id)) throw new Error(`Duplicate migration id ${m.id}`);
    ids.add(m.id);
  }

  await client.query(
    `CREATE TABLE IF NOT EXISTS ${TABLE} (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
  );
  const { rows } = await client.query<{ id: string }>(`SELECT id FROM ${TABLE}`);
  const done = new Set(rows.map((r) => r.id));

  const applied: string[] = [];
  for (const migration of migrations) {
    if (done.has(migration.id)) continue;
    await client.transaction(async () => {
      // Inserting first makes a concurrent runner fail on the primary key instead of applying twice.
      await client.query(`INSERT INTO ${TABLE} (id) VALUES ($1)`, [migration.id]);
      await client.query(migration.sql);
    });
    applied.push(migration.id);
  }
  return applied;
}
