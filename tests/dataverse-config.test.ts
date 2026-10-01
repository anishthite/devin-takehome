import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isDataverseEnabled, readConnection, readMirrorPrefix, readRoleMapping } from "../src/lib/dataverse/config.ts";

const TEMPLATE = "627090ff-40a3-4053-8790-584edc5be201";

describe("dataverse config", () => {
  it("is enabled only by DATAVERSE_ENABLED=true", () => {
    assert.equal(isDataverseEnabled({}), false);
    assert.equal(isDataverseEnabled({ DATAVERSE_ENABLED: "1" }), false);
    assert.equal(isDataverseEnabled({ DATAVERSE_ENABLED: "true" }), true);
  });

  it("parses role template ids and name overrides", () => {
    const mapping = readRoleMapping({
      DATAVERSE_ROLE_TEMPLATE_IDS: `Ledger.Admin=${TEMPLATE}`,
      DATAVERSE_ROLE_NAMES: "Ledger.Viewer=AP Clerk",
    });
    assert.deepEqual(mapping.templateIds, { "Ledger.Admin": TEMPLATE });
    assert.equal(mapping.names["Ledger.Viewer"], "AP Clerk");
    assert.equal(mapping.names["Ledger.Admin"], "Ledger Admin");
  });

  it("rejects unknown roles and non-GUID template ids", () => {
    assert.throws(() => readRoleMapping({ DATAVERSE_ROLE_NAMES: "Ledger.Root=x" }));
    assert.throws(() => readRoleMapping({ DATAVERSE_ROLE_TEMPLATE_IDS: "Ledger.Admin=nope" }));
  });

  it("reads the connection, falling back to the Entra app registration", () => {
    const connection = readConnection({
      DATAVERSE_URL: "https://contoso.crm.dynamics.com/",
      ENTRA_TENANT_ID: "t",
      ENTRA_CLIENT_ID: "c",
      ENTRA_CLIENT_SECRET: "s",
      DATAVERSE_CLIENT_ID: "dc",
    });
    assert.deepEqual(connection, { url: "https://contoso.crm.dynamics.com", tenantId: "t", clientId: "dc", clientSecret: "s" });
    assert.throws(() => readConnection({ DATAVERSE_URL: "http://contoso.crm.dynamics.com", ENTRA_TENANT_ID: "t" }));
    assert.throws(() => readConnection({}));
  });

  it("validates the mirror table publisher prefix", () => {
    assert.equal(readMirrorPrefix({}), null);
    assert.equal(readMirrorPrefix({ DATAVERSE_MIRROR_PREFIX: "cr7f3_" }), "cr7f3_");
    assert.throws(() => readMirrorPrefix({ DATAVERSE_MIRROR_PREFIX: "bad prefix" }));
  });
});
