import assert from "node:assert/strict";
import { test } from "node:test";
import { memoryApprovalStore } from "../../../packages/kit/demo/approvals.ts";
import { memoryAuditLog } from "../../../packages/kit/demo/audit-log.ts";
import type { Actor } from "../../../packages/kit/services/actor.ts";
import { createApprovalService } from "../../../packages/kit/services/approvals.ts";
import { memoryRefundStore } from "../src/lib/refunds/store.ts";
import { canApprove, canDecide, createRefundService, RefundError } from "../src/lib/refunds/service.ts";
import type { NewRefund, Refund } from "../src/lib/refunds/types.ts";

const viewer: Actor = { id: "v", name: "Vic Viewer", roles: ["Ledger.Viewer"] };
const operator: Actor = { id: "o", name: "Olu Operator", roles: ["Ledger.Operator"] };
const approver: Actor = { id: "a", name: "Ana Approver", roles: ["Ledger.Approver"] };
const admin: Actor = { id: "x", name: "Ada Admin", roles: ["Ledger.Admin"] };

const input = (overrides: Partial<NewRefund> = {}): NewRefund => ({
  orderId: "ord-1001",
  customerName: "Jane Doe",
  customerEmail: "Jane@Example.com",
  paymentMethod: "Visa",
  reason: "damaged",
  note: "",
  amountMinor: 129_99,
  ...overrides,
});

function setup(seed: Refund[] = []) {
  const auditLog = memoryAuditLog();
  const approvals = createApprovalService({ store: memoryApprovalStore(), auditLog, mirror: null });
  let ref = 0;
  const refunds = createRefundService({
    store: memoryRefundStore(seed),
    approvals,
    auditLog,
    newProviderRef: () => `re_test${++ref}`,
  });
  return { refunds, approvals, auditLog };
}

test("request normalizes input, opens a kit approval and writes an audit entry", async () => {
  const { refunds, approvals } = setup();
  const r = await refunds.request(operator, input());
  assert.equal(r.status, "pending_approval");
  assert.equal(r.orderId, "ORD-1001");
  assert.equal(r.customerEmail, "jane@example.com");
  assert.equal(r.requestedByName, operator.name);

  const approval = await approvals.get(r.approvalId!);
  assert.equal(approval?.status, "pending");
  assert.equal(approval?.amountMinor, 129_99);

  const trail = await refunds.auditTrail(r);
  assert.deepEqual(trail.map((e) => e.action).sort(), ["Refund requested", "Submitted"]);
});

test("request enforces RBAC and validation", async () => {
  const { refunds } = setup();
  await assert.rejects(refunds.request(viewer, input()), RefundError);
  await assert.rejects(refunds.request(operator, input({ customerEmail: "nope" })), /valid customer email/);
  await assert.rejects(refunds.request(operator, input({ amountMinor: 0 })), /greater than zero/);
  await assert.rejects(refunds.request(operator, input({ amountMinor: 50_000_01 })), /finance/);
  await refunds.request(operator, input());
  await assert.rejects(refunds.request(operator, input({ orderId: "ORD-1001" })), /already has an open refund/);
});

test("maker-checker: requester can't approve, approver can, then operator issues", async () => {
  const { refunds } = setup();
  const r = await refunds.request(approver, input());
  assert.equal(canApprove(approver, r), false);
  await assert.rejects(refunds.decide(approver, r.id, "approved"));

  const other = await refunds.request(operator, input({ orderId: "ORD-2" }));
  assert.equal(canApprove(approver, other), true);
  const approved = await refunds.decide(approver, other.id, "approved", "Photos attached");
  assert.equal(approved.status, "approved");
  assert.equal(approved.decidedByName, approver.name);
  assert.equal(approved.decisionComment, "Photos attached");

  await assert.rejects(refunds.issue(viewer, other.id), /operators/);
  const issued = await refunds.issue(operator, other.id);
  assert.equal(issued.status, "issued");
  assert.equal(issued.providerRef, "re_test1");
  await assert.rejects(refunds.issue(operator, other.id), /Only approved/);

  const actions = (await refunds.auditTrail(issued)).map((e) => e.action);
  assert.deepEqual(actions, ["Refund issued", "Approved", "Refund requested", "Submitted"]);
});

test("refunds over the threshold need an Admin to approve, but an Approver may reject", async () => {
  const { refunds } = setup();
  const big = await refunds.request(operator, input({ amountMinor: 3_000_00 }));
  assert.equal(canApprove(approver, big), false);
  assert.equal(canDecide(approver, big), true);
  assert.equal(canApprove(admin, big), true);
  assert.equal(canDecide(viewer, big), false);
  await assert.rejects(refunds.decide(approver, big.id, "approved"), /need an Admin/);
  assert.equal((await refunds.decide(admin, big.id, "approved")).status, "approved");

  const big2 = await refunds.request(operator, input({ orderId: "ORD-3", amountMinor: 3_000_00 }));
  assert.equal((await refunds.decide(approver, big2.id, "rejected", "No evidence")).status, "rejected");
});

test("only the requester can withdraw a pending refund", async () => {
  const { refunds } = setup();
  const r = await refunds.request(operator, input());
  await assert.rejects(refunds.cancel(admin, r.id));
  assert.equal((await refunds.cancel(operator, r.id)).status, "cancelled");
  // Cancelled refunds no longer block a new request for the same order.
  await refunds.request(operator, input());
});

test("sample history is read-only", async () => {
  const sample: Refund = {
    ...(await setup().refunds.request(operator, input())),
    id: "rf_s0001",
    approvalId: null,
    sample: true,
  };
  const { refunds } = setup([sample]);
  await assert.rejects(refunds.decide(admin, sample.id, "approved"), /read-only/);
  await assert.rejects(refunds.cancel(operator, sample.id), /read-only/);
});

test("activity covers refunds, their approvals and exports, but not other approvals", async () => {
  const { refunds, approvals } = setup();
  await approvals.submit(operator, { title: "Vendor payout", counterparty: "Proseware", amountMinor: 1 });
  const r = await refunds.request(operator, input());
  await refunds.decide(approver, r.id, "rejected");
  await assert.rejects(refunds.recordExport(approver, 3), /admins/);
  await refunds.recordExport(admin, 3);

  const actions = (await refunds.activity()).map((e) => e.action);
  assert.deepEqual(actions, ["Audit log exported", "Rejected", "Refund requested", "Submitted"]);
});
