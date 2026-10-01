import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { memoryApprovalStore } from "../demo/approvals.ts";
import { memoryAuditLog } from "../demo/audit-log.ts";
import { createMockDataverse } from "../demo/dataverse/client.ts";
import { mockFlowApprovals } from "../demo/dataverse/org.ts";
import { DEMO_PERSONAS } from "../demo/personas.ts";
import { approvalStatusMirror } from "../dataverse/approval-mirror.ts";
import { flowApprovalReader } from "../dataverse/flow-approvals.ts";
import type { Actor } from "../services/actor.ts";
import { approvalTarget, createApprovalService, type ApprovalStatusMirror } from "../services/approvals.ts";

const actor = (index: number): Actor => ({ id: DEMO_PERSONAS[index].id, name: DEMO_PERSONAS[index].name, roles: [DEMO_PERSONAS[index].role] });
const [admin, approver, operator, viewer] = [0, 1, 2, 3].map(actor);
const payment = { title: "Lease", counterparty: "Litware", amountMinor: 12_500_00 };

function setup(mirror: ApprovalStatusMirror | null = null) {
  const auditLog = memoryAuditLog();
  return { auditLog, approvals: createApprovalService({ store: memoryApprovalStore(), auditLog, mirror }) };
}

describe("maker-checker approvals", () => {
  it("lets an operator submit and a different approver decide", async () => {
    const { approvals, auditLog } = setup();
    const request = await approvals.submit(operator, payment);
    assert.equal(request.status, "pending");
    const decided = await approvals.decide(approver, request.id, "approved", " ok ");
    assert.equal(decided.status, "approved");
    assert.equal(decided.decidedByName, approver.name);
    assert.equal(decided.comment, "ok");
    assert.deepEqual(
      (await auditLog.list(approvalTarget(request.id))).map((e) => [e.action, e.actorName]),
      [
        ["Approved", approver.name],
        ["Submitted", operator.name],
      ],
    );
  });

  it("enforces roles, separation of duties and pending-only transitions", async () => {
    const { approvals } = setup();
    await assert.rejects(approvals.submit(viewer, payment), /operators/);
    const request = await approvals.submit(admin, payment);
    await assert.rejects(approvals.decide(operator, request.id, "approved"), /approvers/);
    await assert.rejects(approvals.decide(admin, request.id, "approved"), /you submitted/);
    await assert.rejects(approvals.cancel(approver, request.id), /requester/);
    await approvals.decide(approver, request.id, "rejected");
    await assert.rejects(approvals.decide(approver, request.id, "approved"), /already rejected/);
    await assert.rejects(approvals.cancel(admin, request.id), /already rejected/);
  });

  it("validates input", async () => {
    const { approvals } = setup();
    await assert.rejects(approvals.submit(operator, { ...payment, amountMinor: 0 }), /positive/);
    await assert.rejects(approvals.submit(operator, { ...payment, title: "  " }), /required/);
  });

  it("mirrors status to the app-owned Dataverse table as the acting user", async () => {
    const dataverse = createMockDataverse();
    const { approvals } = setup(approvalStatusMirror(dataverse.client, "cr7f3_"));
    const request = await approvals.submit(operator, payment);
    assert.equal(request.mirror?.entitySet, "cr7f3_ledgerapprovals");
    await approvals.decide(approver, request.id, "approved");

    const row = dataverse.tables.get("cr7f3_ledgerapprovals")?.get(request.mirror!.id);
    assert.equal(row?.cr7f3_status, "approved");
    assert.equal(row?.cr7f3_kitrequestid, request.id);
    assert.deepEqual(
      dataverse.requests.filter((r) => r.method !== "GET").map((r) => [r.method, r.callerObjectId]),
      [
        ["POST", operator.id],
        ["PATCH", approver.id],
      ],
    );
  });

  it("keeps the kit record authoritative when mirroring fails", async () => {
    const failing: ApprovalStatusMirror = {
      entitySet: "cr7f3_ledgerapprovals",
      publish: async () => {
        throw new Error("Dataverse unavailable");
      },
    };
    const { approvals } = setup(failing);
    const request = await approvals.submit(operator, payment);
    assert.equal(request.status, "pending");
    assert.equal(request.mirrorError, "Dataverse unavailable");
    assert.equal((await approvals.get(request.id))?.mirrorError, "Dataverse unavailable");
  });
});

describe("Power Automate approvals", () => {
  it("reads msdyn_flow_approval with its responses, without writing", async () => {
    const seed = mockFlowApprovals(new Date("2026-01-02T00:00:00Z"));
    const dataverse = createMockDataverse({
      seed: { msdyn_flow_approvals: seed.approvals, msdyn_flow_approvalresponses: seed.responses },
    });
    const approvals = await flowApprovalReader(dataverse.client).list();
    assert.deepEqual(
      approvals.map((a) => [a.title, a.stage, a.responses.map((r) => [r.responder, r.response])]),
      [
        ["Vendor onboarding: Proseware", "In progress", []],
        ["Wire limit increase: Contoso Ltd", "Complete", [[DEMO_PERSONAS[1].name, "Approve"]]],
      ],
    );
    assert.ok(dataverse.requests.every((r) => r.method === "GET"));
    await assert.rejects(
      dataverse.client.update("msdyn_flow_approvals", seed.approvals[0].msdyn_flow_approvalid, { msdyn_flow_approval_result: "Approve" }, { callerObjectId: DEMO_PERSONAS[1].id }),
      /read-only/,
    );
  });
});
