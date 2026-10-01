import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canApprove,
  parseAmountMinor,
  requiredApproverRole,
  validateAdjustment,
} from "../src/lib/adjustments/policy.ts";
import { safePath, withParam } from "../src/lib/format.ts";

const base = { accountId: "a", direction: "credit", amount: "35.00", reasonCode: "fee_reversal", memo: "Late fee charged in error" };

describe("adjustment policy", () => {
  it("parses dollar amounts into cents", () => {
    assert.equal(parseAmountMinor("35"), 35_00);
    assert.equal(parseAmountMinor("$1,250.5"), 1_250_50);
    assert.throws(() => parseAmountMinor("0.00"), /greater than zero/);
    assert.throws(() => parseAmountMinor("-5"), /like 125.00/);
    assert.throws(() => parseAmountMinor("1.234"), /like 125.00/);
    assert.throws(() => parseAmountMinor("250000.01"), /limit/);
  });

  it("validates reason/direction, memo and account", () => {
    assert.deepEqual(validateAdjustment(base), {
      accountId: "a",
      direction: "credit",
      amountMinor: 35_00,
      reasonCode: "fee_reversal",
      memo: "Late fee charged in error",
    });
    assert.throws(() => validateAdjustment({ ...base, direction: "debit" }), /only be a credit/);
    assert.throws(() => validateAdjustment({ ...base, reasonCode: "because" }), /reason/);
    assert.throws(() => validateAdjustment({ ...base, direction: "sideways" }), /credit or debit/);
    assert.throws(() => validateAdjustment({ ...base, memo: " short " }), /at least/);
    assert.throws(() => validateAdjustment({ ...base, memo: "x".repeat(501) }), /at most/);
    assert.throws(() => validateAdjustment({ ...base, accountId: " " }), /account/);
  });

  it("needs an Admin above the threshold", () => {
    assert.equal(requiredApproverRole(10_000_00), "Ledger.Approver");
    assert.equal(requiredApproverRole(10_000_01), "Ledger.Admin");
    assert.equal(canApprove(["Ledger.Approver"], 10_000_01), false);
    assert.equal(canApprove(["Ledger.Admin"], 10_000_01), true);
  });

  it("only redirects to same-app paths", () => {
    assert.equal(safePath("/customers/1"), "/customers/1");
    assert.equal(safePath("//evil.example"), "/");
    assert.equal(safePath("https://evil.example"), "/");
    assert.equal(safePath("/\\evil.example"), "/");
    assert.equal(withParam("/approvals?error=x", "notice", "ok"), "/approvals?notice=ok");
  });
});
