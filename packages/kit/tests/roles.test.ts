import assert from "node:assert/strict";
import { test } from "node:test";
import { hasRole, highestRole, parseRoles } from "../auth/roles.ts";

test("parseRoles keeps only known ledger roles", () => {
  assert.deepEqual(parseRoles(["Ledger.Admin", "Other.Role", 42, "Ledger.Viewer"]), [
    "Ledger.Viewer",
    "Ledger.Admin",
  ]);
  assert.deepEqual(parseRoles(undefined), []);
  assert.deepEqual(parseRoles("Ledger.Admin"), []);
});

test("highestRole picks the most privileged role", () => {
  assert.equal(highestRole(["Ledger.Viewer", "Ledger.Approver"]), "Ledger.Approver");
  assert.equal(highestRole([]), null);
});

test("hasRole is hierarchical", () => {
  assert.equal(hasRole(["Ledger.Approver"], "Ledger.Operator"), true);
  assert.equal(hasRole(["Ledger.Approver"], "Ledger.Viewer"), true);
  assert.equal(hasRole(["Ledger.Operator"], "Ledger.Approver"), false);
  assert.equal(hasRole([], "Ledger.Viewer"), false);
});
