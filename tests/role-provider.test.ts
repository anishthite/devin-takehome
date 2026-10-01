import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMockDataverse } from "../src/demo/dataverse/client.ts";
import { MOCK_ROLES, MOCK_ROLE_MAPPING, MOCK_SYSTEM_ADMINISTRATOR_TEMPLATE_ID } from "../src/demo/dataverse/org.ts";
import { DEMO_PERSONAS } from "../src/demo/personas.ts";
import { DEFAULT_ROLE_NAMES, dataverseRoleProvider, mapDataverseRoles } from "../src/lib/dataverse/role-provider.ts";
import { cachePerSession, claimsRoleProvider, type RoleProvider } from "../src/lib/kit/role-provider.ts";
import type { Role } from "../src/lib/roles.ts";

const subject = (index: number, sessionId = "s1") => ({ id: DEMO_PERSONAS[index].id, sessionId, roles: [] });

describe("mapDataverseRoles", () => {
  it("matches role template ids before names", () => {
    const renamed = { ...MOCK_ROLES.systemAdministrator, name: "Renamed Admin" };
    assert.deepEqual(mapDataverseRoles([renamed], MOCK_ROLE_MAPPING), ["Ledger.Admin"]);
  });

  it("falls back to case-insensitive role names and ignores unmapped roles", () => {
    const roles = [
      { roleid: "d0000000-0000-4000-d000-0000000000aa", name: "ledger operator", _roletemplateid_value: null },
      MOCK_ROLES.basicUser,
    ];
    assert.deepEqual(mapDataverseRoles(roles, { templateIds: {}, names: DEFAULT_ROLE_NAMES }), ["Ledger.Operator"]);
  });

  it("does not map a template id that isn't configured by name", () => {
    const mapping = { templateIds: {}, names: DEFAULT_ROLE_NAMES };
    assert.deepEqual(mapDataverseRoles([MOCK_ROLES.systemAdministrator], mapping), []);
    assert.equal(MOCK_ROLES.systemAdministrator._roletemplateid_value, MOCK_SYSTEM_ADMINISTRATOR_TEMPLATE_ID);
  });
});

describe("dataverseRoleProvider", () => {
  it("resolves each persona's Dataverse roles via RetrieveAadUserRoles, including team roles", async () => {
    const { client, requests } = createMockDataverse();
    const provider = dataverseRoleProvider(client, MOCK_ROLE_MAPPING);
    const resolved = await Promise.all(DEMO_PERSONAS.map((_, i) => provider.getRoles(subject(i))));
    assert.deepEqual(resolved, [["Ledger.Admin"], ["Ledger.Approver"], ["Ledger.Operator"], ["Ledger.Viewer"]]);
    assert.equal(
      requests[0].path,
      `RetrieveAadUserRoles(DirectoryObjectId=@p0)?@p0=${DEMO_PERSONAS[0].id}&$select=roleid,name,_roletemplateid_value`,
    );
  });

  it("ignores Entra claims and returns no roles for unknown users", async () => {
    const { client } = createMockDataverse();
    const provider = dataverseRoleProvider(client, MOCK_ROLE_MAPPING);
    const roles = await provider.getRoles({
      id: "99999999-0000-4000-a000-000000000000",
      sessionId: "s",
      roles: ["Ledger.Admin"],
    });
    assert.deepEqual(roles, []);
  });

  it("rejects non-GUID object ids", async () => {
    const { client } = createMockDataverse();
    await assert.rejects(dataverseRoleProvider(client, MOCK_ROLE_MAPPING).getRoles({ id: "x')", sessionId: "s", roles: [] }));
  });
});

describe("cachePerSession", () => {
  function counting(result: () => Promise<Role[]>) {
    let calls = 0;
    const provider: RoleProvider = {
      getRoles() {
        calls++;
        return result();
      },
    };
    return { provider, calls: () => calls };
  }

  it("resolves once per session", async () => {
    const inner = counting(async () => ["Ledger.Viewer"]);
    const cached = cachePerSession(inner.provider, 60_000);
    await cached.getRoles(subject(0, "a"));
    await cached.getRoles(subject(0, "a"));
    assert.equal(inner.calls(), 1);
    await cached.getRoles(subject(0, "b"));
    assert.equal(inner.calls(), 2);
  });

  it("expires entries after the TTL", async () => {
    let time = 0;
    const inner = counting(async () => ["Ledger.Viewer"]);
    const cached = cachePerSession(inner.provider, 1_000, () => time);
    await cached.getRoles(subject(0));
    time = 1_000;
    await cached.getRoles(subject(0));
    assert.equal(inner.calls(), 2);
  });

  it("does not cache failures", async () => {
    let fail = true;
    const inner = counting(async () => {
      if (fail) throw new Error("boom");
      return ["Ledger.Admin"];
    });
    const cached = cachePerSession(inner.provider, 60_000);
    await assert.rejects(cached.getRoles(subject(0)));
    fail = false;
    assert.deepEqual(await cached.getRoles(subject(0)), ["Ledger.Admin"]);
  });
});

it("claimsRoleProvider returns the Entra app-role claims", async () => {
  assert.deepEqual(await claimsRoleProvider.getRoles({ id: "x", sessionId: "s", roles: ["Ledger.Operator"] }), [
    "Ledger.Operator",
  ]);
});
