import { AsyncLocalStorage } from "node:async_hooks";
import { newDb, type IMemoryDb } from "pg-mem";
import type pg from "pg";
import type { SqlClient, SqlValue } from "./client.ts";
import { postgresClientFromPool } from "./postgres.ts";

export interface MockSql {
  client: SqlClient;
  /** The underlying pg-mem database, for assertions in tests. */
  db: IMemoryDb;
}

/**
 * In-memory Postgres (pg-mem) behind the same `SqlClient` interface and `pg` adapter code as production.
 * pg-mem doesn't implement ROLLBACK, so transactions are serialized and undone by restoring a snapshot.
 */
export function createMockSqlClient(): MockSql {
  const db = newDb({ noAstCoverageCheck: true });
  db.public.registerFunction({ name: "version", returns: "text" as never, implementation: () => "pg-mem" });
  const { Pool } = db.adapters.createPg();
  const inner = postgresClientFromPool(new Pool() as pg.Pool);

  const inTransaction = new AsyncLocalStorage<true>();
  let queue: Promise<unknown> = Promise.resolve();
  function exclusive<T>(fn: () => Promise<T>): Promise<T> {
    if (inTransaction.getStore()) return fn();
    const run = queue.then(() => inTransaction.run(true, fn));
    queue = run.catch(() => undefined);
    return run;
  }

  const client: SqlClient = {
    dialect: "postgres",
    query: <Row extends object>(text: string, params?: readonly SqlValue[]) =>
      exclusive(() => inner.query<Row>(text, params)),
    transaction<T>(fn: () => Promise<T>) {
      if (inTransaction.getStore()) return fn();
      return exclusive(async () => {
        const snapshot = db.backup();
        try {
          return await fn();
        } catch (error) {
          snapshot.restore();
          throw error;
        }
      });
    },
    ping: async () => {},
    close: async () => {},
  };
  return { client, db };
}
