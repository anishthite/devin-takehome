import assert from "node:assert/strict";
import { test } from "node:test";
import { entraIssuer, isFromTenant } from "../src/lib/entra.ts";

const TENANT = "11111111-2222-3333-4444-555555555555";

test("entraIssuer builds a tenant-locked v2.0 issuer", () => {
  assert.equal(entraIssuer(TENANT), `https://login.microsoftonline.com/${TENANT}/v2.0`);
});

test("entraIssuer rejects multi-tenant aliases", () => {
  for (const alias of ["common", "organizations", "consumers", ""]) {
    assert.throws(() => entraIssuer(alias));
  }
});

test("isFromTenant matches the tid claim case-insensitively", () => {
  assert.equal(isFromTenant(TENANT.toUpperCase(), TENANT), true);
  assert.equal(isFromTenant("99999999-2222-3333-4444-555555555555", TENANT), false);
  assert.equal(isFromTenant(undefined, TENANT), false);
});
