import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { memoryAuditLog } from "../src/demo/audit-log.ts";
import { createMockDataverse } from "../src/demo/dataverse/client.ts";
import { MOCK_APPLICATION_USER } from "../src/demo/dataverse/org.ts";
import { DEMO_PERSONAS } from "../src/demo/personas.ts";
import { dataverseAuditReader } from "../src/lib/dataverse/audit-reader.ts";
import { mergeAuditTrail } from "../src/lib/kit/audit-reader.ts";

const [admin, approver] = DEMO_PERSONAS;

function clock(start = Date.parse("2026-01-01T00:00:00Z")) {
  let t = start;
  return () => new Date((t += 1000));
}

describe("mock Dataverse auditing", () => {
  it("attributes impersonated writes to the caller, with the application user as calling user", async () => {
    const { client } = createMockDataverse({ now: clock() });
    const id = await client.create("cr7f3_ledgerapprovals", { cr7f3_status: "pending" }, { callerObjectId: admin.id });
    await client.update("cr7f3_ledgerapprovals", id, { cr7f3_status: "approved" }, { callerObjectId: approver.id });

    const history = await dataverseAuditReader(client).recordChangeHistory({ entitySet: "cr7f3_ledgerapprovals", id });
    assert.deepEqual(
      history.map((e) => [e.source, e.action, e.actorName, e.callingUserName]),
      [
        ["dataverse", "Update", approver.name, MOCK_APPLICATION_USER.fullname],
        ["dataverse", "Create", admin.name, MOCK_APPLICATION_USER.fullname],
      ],
    );
    assert.deepEqual(history[0].changes, [{ attribute: "cr7f3_status", oldValue: "pending", newValue: "approved" }]);
    assert.equal(history[0].target.type, "cr7f3_ledgerapproval");
  });

  it("rejects writes from users without a Dataverse systemuser", async () => {
    const { client } = createMockDataverse();
    await assert.rejects(
      client.create("accounts", {}, { callerObjectId: "99999999-0000-4000-a000-000000000000" }),
      /does not exist/,
    );
  });

  it("follows PagingCookie across pages", async () => {
    const { client, requests } = createMockDataverse({ now: clock() });
    const id = await client.create("accounts", { name: "a" }, { callerObjectId: admin.id });
    await client.update("accounts", id, { name: "b" }, { callerObjectId: admin.id });
    await client.update("accounts", id, { name: "c" }, { callerObjectId: admin.id });

    const history = await dataverseAuditReader(client, 2).recordChangeHistory({ entitySet: "accounts", id });
    assert.deepEqual(history.map((e) => e.changes[0].newValue), ["c", "b", "a"]);
    const calls = requests.filter((r) => r.path.startsWith("RetrieveRecordChangeHistory"));
    assert.equal(calls.length, 2);
    assert.match(decodeURIComponent(calls[1].path), /"PageNumber":2,"Count":2/);
  });
});

describe("mergeAuditTrail", () => {
  it("merges kit audit_log and Dataverse history newest first, labeled by source", async () => {
    const now = clock();
    const log = memoryAuditLog(now);
    const { client } = createMockDataverse({ now });
    await log.append({ actorId: admin.id, actorName: admin.name, action: "Submitted", target: { type: "approval_request", id: "r1" }, changes: [] });
    const id = await client.create("accounts", { name: "a" }, { callerObjectId: admin.id });
    await log.append({ actorId: approver.id, actorName: approver.name, action: "Approved", target: { type: "approval_request", id: "r1" }, changes: [] });

    const merged = mergeAuditTrail(
      await log.list({ type: "approval_request", id: "r1" }),
      await dataverseAuditReader(client).recordChangeHistory({ entitySet: "accounts", id }),
    );
    assert.deepEqual(
      merged.map((e) => [e.source, e.action]),
      [
        ["kit", "Approved"],
        ["dataverse", "Create"],
        ["kit", "Submitted"],
      ],
    );
  });
});
