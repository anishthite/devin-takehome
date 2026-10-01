import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { memoryApprovalStore } from "../../../packages/kit/demo/approvals.ts";
import { DEMO_PERSONAS } from "../../../packages/kit/demo/personas.ts";
import type { Actor } from "../../../packages/kit/services/actor.ts";
import { approvalTarget, createApprovalService } from "../../../packages/kit/services/approvals.ts";
import type { AuditLog } from "../../../packages/kit/services/audit-log.ts";
import { sqlApprovalStore } from "../../../packages/kit/sql/approval-store.ts";
import { sqlAuditLog } from "../../../packages/kit/sql/audit-log.ts";
import type { SqlClient } from "../../../packages/kit/sql/client.ts";
import { runMigrations } from "../../../packages/kit/sql/migrate.ts";
import { KIT_SQL_MIGRATIONS } from "../../../packages/kit/sql/migrations.ts";
import { createMockSqlClient } from "../../../packages/kit/sql/mock.ts";
import { sqlCustomerAccounts } from "../src/lib/adjustments/accounts.ts";
import { ADJUSTMENT_MIGRATIONS } from "../src/lib/adjustments/migrations.ts";
import { ACCOUNT_TARGET_TYPE, ADJUSTMENT_KIND } from "../src/lib/adjustments/policy.ts";
import { DEMO_ACCOUNT_IDS, seedDemoAccounts } from "../src/lib/adjustments/seed.ts";
import { createAdjustmentService, type AdjustmentService } from "../src/lib/adjustments/service.ts";

const actor = (i: number): Actor => ({ id: DEMO_PERSONAS[i].id, name: DEMO_PERSONAS[i].name, roles: [DEMO_PERSONAS[i].role] });
const [admin, approver, operator, viewer] = [0, 1, 2, 3].map(actor);
const [northwind, contoso, fabrikam, , tailspin] = DEMO_ACCOUNT_IDS;

const credit = { accountId: contoso, direction: "credit", amount: "35.00", reasonCode: "fee_reversal", memo: "Late fee charged in error" };

let sql: SqlClient;
let auditLog: AuditLog;
let service: AdjustmentService;

/** Kit audit_log and approvals in the same (mock) database as the customer accounts, as in production. */
beforeEach(async () => {
  sql = createMockSqlClient().client;
  await runMigrations(sql, [...KIT_SQL_MIGRATIONS, ...ADJUSTMENT_MIGRATIONS]);
  await seedDemoAccounts(sql);
  auditLog = sqlAuditLog(sql);
  const approvals = createApprovalService({ store: sqlApprovalStore(sql), auditLog, mirror: null, transaction: sql.transaction });
  service = createAdjustmentService({ accounts: sqlCustomerAccounts(sql), approvals, auditLog, transaction: sql.transaction });
});

const balance = async (id: string) => (await service.accounts.get(id))!.balanceMinor;

describe("balance adjustments", () => {
  it("moves no money until a different approver approves, then posts once with an audit trail", async () => {
    const before = await balance(contoso);
    const request = await service.submit(operator, credit);
    assert.equal(request.status, "pending");
    assert.equal(await balance(contoso), before);

    const decided = await service.decide(approver, request.id, "approved", "Checked");
    assert.equal(decided.status, "approved");
    assert.equal(await balance(contoso), before + 35_00);

    const [posted] = await service.accounts.adjustments(contoso);
    assert.deepEqual(
      [posted.amountMinor, posted.balanceBeforeMinor, posted.balanceAfterMinor, posted.requestedByName, posted.approvedByName],
      [35_00, before, before + 35_00, operator.name, approver.name],
    );
    assert.deepEqual(
      (await auditLog.list({ type: ACCOUNT_TARGET_TYPE, id: contoso })).map((e) => [e.action, e.actorName]),
      [
        ["Balance adjusted", approver.name],
        ["Adjustment requested", operator.name],
      ],
    );
    assert.deepEqual((await auditLog.list(approvalTarget(request.id))).map((e) => e.action), ["Approved", "Submitted"]);
  });

  it("enforces roles and separation of duties", async () => {
    await assert.rejects(service.submit(viewer, credit), /Only operators/);
    const request = await service.submit(admin, credit);
    await assert.rejects(service.decide(operator, request.id, "approved"), /approvers/);
    await assert.rejects(service.decide(admin, request.id, "approved"), /you submitted/);
    await assert.rejects(service.cancel(approver, request.id), /requester/);
  });

  it("requires an Admin checker above $10,000", async () => {
    const big = await service.submit(operator, { ...credit, accountId: northwind, amount: "10000.01", reasonCode: "posting_error" });
    await assert.rejects(service.decide(approver, big.id, "approved"), /Admin/);
    assert.equal((await service.decide(approver, big.id, "rejected", "No")).status, "rejected");
    const again = await service.submit(operator, { ...credit, accountId: northwind, amount: "10000.01", reasonCode: "posting_error" });
    assert.equal((await service.decide(admin, again.id, "approved")).status, "approved");
  });

  it("refuses overdrafts at submit and re-checks the live balance at approval", async () => {
    const debit = { ...credit, accountId: fabrikam, direction: "debit", reasonCode: "chargeback" };
    await assert.rejects(service.submit(operator, { ...debit, amount: "312.01" }), /below zero/);
    const first = await service.submit(operator, { ...debit, amount: "300.00" });
    const second = await service.submit(operator, { ...debit, amount: "200.00" });
    await service.decide(approver, first.id, "approved");
    await assert.rejects(service.decide(approver, second.id, "approved"), /below zero/);

    assert.equal(await balance(fabrikam), 12_00);
    assert.equal((await service.get(second.id)).status, "pending");
    assert.equal((await service.accounts.adjustments(fabrikam)).length, 1);
    assert.deepEqual((await auditLog.list(approvalTarget(second.id))).map((e) => e.action), ["Submitted"]);
  });

  it("refuses frozen accounts and identical pending requests", async () => {
    await assert.rejects(service.submit(operator, { ...credit, accountId: tailspin }), /frozen/);
    await service.submit(operator, credit);
    await assert.rejects(service.submit(operator, credit), /identical/);
  });

  it("posts idempotently per approval", async () => {
    const accounts = sqlCustomerAccounts(sql);
    const input = {
      accountId: contoso,
      approvalId: "approval-1",
      direction: "credit" as const,
      signedAmountMinor: 10_00,
      reasonCode: "fee_reversal",
      memo: "m",
      requestedBy: operator,
      approvedBy: approver,
    };
    const before = await balance(contoso);
    const first = await accounts.post(input);
    const second = await accounts.post(input);
    assert.equal(second.replayed, true);
    assert.equal(second.adjustment.id, first.adjustment.id);
    assert.equal(await balance(contoso), before + 10_00);
  });

  it("only lists and decides its own kind of approval", async () => {
    const approvals = createApprovalService({ store: memoryApprovalStore(), auditLog, mirror: null });
    const payment = await approvals.submit(operator, { title: "Lease", counterparty: "Litware", amountMinor: 100 });
    const other = createAdjustmentService({ accounts: sqlCustomerAccounts(sql), approvals, auditLog, transaction: sql.transaction });
    await assert.rejects(other.decide(approver, payment.id, "approved"), /not found/);
    assert.deepEqual(await other.listRequests(), []);
    const adj = await other.submit(operator, credit);
    assert.equal((await approvals.get(adj.id))?.kind, ADJUSTMENT_KIND);
  });
});
