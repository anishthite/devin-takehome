import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { memoryApprovalStore } from "../demo/approvals.ts";
import { memoryAuditLog } from "../demo/audit-log.ts";
import { DEMO_PERSONAS } from "../demo/personas.ts";
import type { Actor } from "../services/actor.ts";
import { approvalTarget, createApprovalService } from "../services/approvals.ts";
import { withAudit } from "../services/audit-log.ts";
import { sqlApprovalStore } from "../sql/approval-store.ts";
import { sqlAuditLog } from "../sql/audit-log.ts";
import { isUniqueViolation, toSafeInteger, type SqlClient } from "../sql/client.ts";
import { readSqlConfig } from "../sql/config.ts";
import { runMigrations } from "../sql/migrate.ts";
import { KIT_SQL_MIGRATIONS } from "../sql/migrations.ts";
import { createMockSqlClient } from "../sql/mock.ts";
import { postgresClient } from "../sql/postgres.ts";

const actor = (i: number): Actor => ({ id: DEMO_PERSONAS[i].id, name: DEMO_PERSONAS[i].name, roles: [DEMO_PERSONAS[i].role] });
const [, approver, operator] = [0, 1, 2].map(actor);
const payment = { title: "Lease", counterparty: "Litware", amountMinor: 12_500_00 };

async function migrated(client: SqlClient) {
  await runMigrations(client, KIT_SQL_MIGRATIONS);
  await client.query(`CREATE TABLE IF NOT EXISTS t (id text PRIMARY KEY, n bigint NOT NULL)`);
  await client.query(`DELETE FROM t`);
  return client;
}

/** Shared behaviour, run against the pg-mem mock and (with TEST_DATABASE_URL) a real Postgres. */
function contract(name: string, connect: () => Promise<SqlClient>) {
  describe(`SqlClient contract: ${name}`, () => {
    it("commits on success and rolls back everything when the transaction throws", async () => {
      const sql = await connect();
      await sql.transaction(async () => {
        await sql.query(`INSERT INTO t (id, n) VALUES ($1, $2)`, ["a", 1]);
      });
      await assert.rejects(
        sql.transaction(async () => {
          await sql.query(`UPDATE t SET n = 2 WHERE id = $1`, ["a"]);
          await sql.transaction(() => sql.query(`INSERT INTO t (id, n) VALUES ($1, $2)`, ["b", 1]));
          throw new Error("boom");
        }),
        /boom/,
      );
      const { rows } = await sql.query<{ id: string; n: unknown }>(`SELECT id, n FROM t ORDER BY id`);
      assert.deepEqual(rows.map((r) => [r.id, toSafeInteger(r.n, "n")]), [["a", 1]]);
    });

    it("reports unique violations with the Postgres SQLSTATE", async () => {
      const sql = await connect();
      await sql.query(`INSERT INTO t (id, n) VALUES ('u', 1)`);
      const error = await sql.query(`INSERT INTO t (id, n) VALUES ('u', 1)`).catch((e: unknown) => e);
      assert.ok(isUniqueViolation(error));
    });

    it("keeps an approval, its audit entry and the effect it authorizes in one transaction", async () => {
      const sql = await connect();
      const auditLog = sqlAuditLog(sql);
      const approvals = createApprovalService({ store: sqlApprovalStore(sql), auditLog, mirror: null, transaction: sql.transaction });
      const request = await approvals.submit(operator, { ...payment, kind: "test_kind", details: { ref: "x" } });
      await assert.rejects(
        approvals.decide(approver, request.id, "approved", undefined, {
          kind: "test_kind",
          onApproved: async () => {
            await sql.query(`INSERT INTO t (id, n) VALUES ('effect', 1)`);
            throw new Error("posting failed");
          },
        }),
        /posting failed/,
      );
      assert.equal((await approvals.get(request.id))?.status, "pending");
      assert.equal((await sql.query(`SELECT 1 FROM t WHERE id = 'effect'`)).rowCount, 0);
      assert.deepEqual((await auditLog.list(approvalTarget(request.id))).map((e) => e.action), ["Submitted"]);

      await approvals.decide(approver, request.id, "approved", "ok", {
        kind: "test_kind",
        onApproved: async () => void (await sql.query(`INSERT INTO t (id, n) VALUES ('effect', 1)`)),
      });
      const saved = await approvals.get(request.id);
      assert.equal(saved?.status, "approved");
      assert.deepEqual(saved?.details, { ref: "x" });
      assert.deepEqual((await approvals.list({ kind: "test_kind" })).map((r) => r.id), [request.id]);
      assert.deepEqual(await approvals.list({ kind: "payment" }), []);
      assert.deepEqual((await auditLog.list(approvalTarget(request.id))).map((e) => e.action), ["Approved", "Submitted"]);
    });
  });
}

contract("pg-mem mock", async () => migrated(createMockSqlClient().client));

const live = process.env.TEST_DATABASE_URL;
if (live) {
  let client: SqlClient | undefined;
  contract("live Postgres", async () => {
    client ??= postgresClient(readSqlConfig({ DATABASE_URL: live }));
    await client.query(`DROP TABLE IF EXISTS t, kit_audit_log, kit_approval_requests, kit_schema_migrations`);
    return migrated(client);
  });
  after(() => client?.close());
}

describe("runMigrations", () => {
  it("applies each migration once and rejects duplicate ids", async () => {
    const { client } = createMockSqlClient();
    assert.deepEqual(await runMigrations(client, KIT_SQL_MIGRATIONS), ["kit_001_audit_log", "kit_002_approval_requests"]);
    assert.deepEqual(await runMigrations(client, KIT_SQL_MIGRATIONS), []);
    await assert.rejects(runMigrations(client, [KIT_SQL_MIGRATIONS[0], KIT_SQL_MIGRATIONS[0]]), /Duplicate/);
  });

  it("does not record a migration whose SQL fails", async () => {
    const { client } = createMockSqlClient();
    await assert.rejects(runMigrations(client, [{ id: "bad", sql: "CREATE TABLE (" }]));
    assert.deepEqual(await runMigrations(client, [{ id: "bad", sql: "CREATE TABLE ok (id text)" }]), ["bad"]);
  });
});

describe("readSqlConfig", () => {
  it("defaults to verified TLS for remote hosts and plain TCP for localhost", () => {
    assert.equal(readSqlConfig({ DATABASE_URL: "postgres://u:p@db.example.com/core" }).ssl, "require");
    assert.equal(readSqlConfig({ DATABASE_URL: "postgres://u:p@localhost/core" }).ssl, "disable");
  });

  it("rejects bad input", () => {
    assert.throws(() => readSqlConfig({}), /DATABASE_URL/);
    assert.throws(() => readSqlConfig({ DATABASE_URL: "mysql://x/y" }), /postgres/);
    assert.throws(() => readSqlConfig({ DATABASE_URL: "postgres://h/db", DATABASE_SSL: "maybe" }), /DATABASE_SSL/);
    assert.throws(
      () => readSqlConfig({ DATABASE_URL: "postgres://db.example.com/db", DATABASE_SSL: "disable", NODE_ENV: "production" }),
      /only allowed/,
    );
    assert.throws(() => readSqlConfig({ DATABASE_URL: "postgres://h/db", DATABASE_POOL_MAX: "0" }), /DATABASE_POOL_MAX/);
  });
});

describe("withAudit", () => {
  it("logs after the change succeeds and logs nothing when it throws", async () => {
    const auditLog = memoryAuditLog();
    const target = { type: "thing", id: "1" };
    const result = await withAudit(
      auditLog,
      operator,
      { action: "Changed", target, changes: (n: number) => [{ attribute: "n", oldValue: 1, newValue: n }] },
      async () => 2,
    );
    assert.equal(result, 2);
    await assert.rejects(withAudit(auditLog, operator, { action: "Failed", target }, async () => Promise.reject(new Error("no"))));
    assert.deepEqual(
      (await auditLog.list(target)).map((e) => [e.action, e.actorName, e.changes]),
      [["Changed", operator.name, [{ attribute: "n", oldValue: 1, newValue: 2 }]]],
    );
  });
});

describe("approval kinds", () => {
  it("refuses to decide a request of another kind", async () => {
    const approvals = createApprovalService({ store: memoryApprovalStore(), auditLog: memoryAuditLog(), mirror: null });
    const other = await approvals.submit(operator, { ...payment, kind: "balance_adjustment" });
    await assert.rejects(approvals.decide(approver, other.id, "approved"), /app that owns it/);
    const pay = await approvals.submit(operator, payment);
    assert.equal(pay.kind, "payment");
    await assert.rejects(approvals.decide(approver, pay.id, "approved", undefined, { kind: "balance_adjustment" }), /app that owns it/);
    assert.equal((await approvals.decide(approver, pay.id, "approved")).status, "approved");
  });
});
