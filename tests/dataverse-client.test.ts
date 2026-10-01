import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { entityReferenceLiteral, functionPath, guidLiteral } from "../src/lib/dataverse/client.ts";
import { clientCredentialsTokenSource, httpDataverseClient } from "../src/lib/dataverse/http-client.ts";

const CONNECTION = {
  url: "https://contoso.crm.dynamics.com",
  tenantId: "11111111-1111-4111-8111-111111111111",
  clientId: "app-id",
  clientSecret: "app-secret",
};
const OID = "22222222-2222-4222-8222-222222222222";
const ROW_ID = "33333333-3333-4333-8333-333333333333";

interface Call {
  url: string;
  init: RequestInit;
}

function fakeFetch(respond: (call: Call) => Response) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const call = { url: String(input), init };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

const headers = (call: Call) => new Headers(call.init.headers);
const tokens = { getToken: async () => "token-1" };

describe("clientCredentialsTokenSource", () => {
  it("requests <environment>/.default with client credentials and reuses the token", async () => {
    const { fetchImpl, calls } = fakeFetch(() => Response.json({ access_token: "abc", expires_in: 3600 }));
    const source = clientCredentialsTokenSource(CONNECTION, fetchImpl, () => 0);
    assert.equal(await source.getToken(), "abc");
    assert.equal(await source.getToken(), "abc");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `https://login.microsoftonline.com/${CONNECTION.tenantId}/oauth2/v2.0/token`);
    const body = new URLSearchParams(String(calls[0].init.body));
    assert.equal(body.get("grant_type"), "client_credentials");
    assert.equal(body.get("scope"), "https://contoso.crm.dynamics.com/.default");
    assert.equal(body.get("client_id"), "app-id");
  });

  it("refreshes before expiry", async () => {
    let time = 0;
    const { fetchImpl, calls } = fakeFetch(() => Response.json({ access_token: "abc", expires_in: 600 }));
    const source = clientCredentialsTokenSource(CONNECTION, fetchImpl, () => time);
    await source.getToken();
    time = 5 * 60 * 1000;
    await source.getToken();
    assert.equal(calls.length, 2);
  });
});

describe("httpDataverseClient", () => {
  it("reads without impersonation and asks for formatted values", async () => {
    const { fetchImpl, calls } = fakeFetch(() => Response.json({ value: [] }));
    const client = httpDataverseClient(CONNECTION, tokens, fetchImpl);
    await client.retrieveMultiple("accounts", "$select=name");
    assert.equal(calls[0].url, "https://contoso.crm.dynamics.com/api/data/v9.2/accounts?$select=name");
    const h = headers(calls[0]);
    assert.equal(h.get("Authorization"), "Bearer token-1");
    assert.equal(h.get("OData-Version"), "4.0");
    assert.match(h.get("Prefer") ?? "", /FormattedValue/);
    assert.equal(h.get("CallerObjectId"), null);
  });

  it("impersonates the signed-in user with CallerObjectId on create", async () => {
    const { fetchImpl, calls } = fakeFetch(
      () =>
        new Response(null, {
          status: 204,
          headers: { "OData-EntityId": `https://contoso.crm.dynamics.com/api/data/v9.2/accounts(${ROW_ID})` },
        }),
    );
    const client = httpDataverseClient(CONNECTION, tokens, fetchImpl);
    const id = await client.create("accounts", { name: "Contoso" }, { callerObjectId: OID.toUpperCase() });
    assert.equal(id, ROW_ID);
    assert.equal(calls[0].init.method, "POST");
    assert.equal(headers(calls[0]).get("CallerObjectId"), OID);
    assert.equal(calls[0].init.body, JSON.stringify({ name: "Contoso" }));
  });

  it("impersonates on update and prevents upsert with If-Match", async () => {
    const { fetchImpl, calls } = fakeFetch(() => new Response(null, { status: 204 }));
    const client = httpDataverseClient(CONNECTION, tokens, fetchImpl);
    await client.update("accounts", ROW_ID, { name: "x" }, { callerObjectId: OID });
    assert.equal(calls[0].url, `https://contoso.crm.dynamics.com/api/data/v9.2/accounts(${ROW_ID})`);
    assert.equal(calls[0].init.method, "PATCH");
    assert.equal(headers(calls[0]).get("CallerObjectId"), OID);
    assert.equal(headers(calls[0]).get("If-Match"), "*");
  });

  it("refuses writes without a caller or to Power Automate approval tables", async () => {
    const { fetchImpl, calls } = fakeFetch(() => new Response(null, { status: 204 }));
    const client = httpDataverseClient(CONNECTION, tokens, fetchImpl);
    await assert.rejects(client.create("accounts", {}, { callerObjectId: "" }), /CallerObjectId/);
    await assert.rejects(client.create("msdyn_flow_approvals", {}, { callerObjectId: OID }), /read-only/);
    await assert.rejects(client.update("msdyn_flow_approvalresponses", ROW_ID, {}, { callerObjectId: OID }), /read-only/);
    assert.equal(calls.length, 0);
  });

  it("surfaces Dataverse error bodies", async () => {
    const { fetchImpl } = fakeFetch(() =>
      Response.json({ error: { code: "0x80040217", message: "Does Not Exist" } }, { status: 404 }),
    );
    const client = httpDataverseClient(CONNECTION, tokens, fetchImpl);
    await assert.rejects(client.retrieve("accounts", ROW_ID), { name: "DataverseError", status: 404, code: "0x80040217" });
  });
});

describe("function paths", () => {
  it("passes parameters as aliased, URL-encoded literals", () => {
    assert.equal(
      functionPath("RetrieveAadUserRoles", { DirectoryObjectId: guidLiteral(OID) }),
      `RetrieveAadUserRoles(DirectoryObjectId=@p0)?@p0=${OID}`,
    );
    assert.equal(
      functionPath("RetrieveRecordChangeHistory", { Target: entityReferenceLiteral("accounts", ROW_ID) }),
      `RetrieveRecordChangeHistory(Target=@p0)?@p0=${encodeURIComponent(`{"@odata.id":"accounts(${ROW_ID})"}`)}`,
    );
  });

  it("rejects injection in identifiers and GUIDs", () => {
    assert.throws(() => functionPath("Foo()/x", {}));
    assert.throws(() => entityReferenceLiteral("accounts", "1) or 1 eq 1"));
  });
});
