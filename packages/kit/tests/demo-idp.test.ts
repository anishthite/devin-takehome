import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import * as oauth from "oauth4webapi";
import { createLocalJWKSet, jwtVerify } from "jose";

process.env.DEMO_MODE = "true";
process.env.DEMO_IDP_URL = "http://idp.test";

const { DEMO_CALLBACK_PATH, DEMO_CLIENT_ID, DEMO_CLIENT_SECRET, demoIssuer } = await import(
  "../demo/idp/config.ts"
);
const idp = await import("../demo/idp/handlers.ts");
const { DEMO_TENANT_ID } = await import("../demo/mode.ts");
const { DEMO_PERSONAS } = await import("../demo/personas.ts");

const REDIRECT_URI = `http://app.test${DEMO_CALLBACK_PATH}`;
const persona = DEMO_PERSONAS.find((p) => p.role === "Ledger.Approver")!;

/** Routes oauth4webapi's HTTP calls straight into the handlers. */
const idpFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init);
  const path = new URL(request.url).pathname.replace(/^\/demo-idp/, "");
  switch (path) {
    case "/.well-known/openid-configuration":
      return idp.discovery();
    case "/authorize":
      return idp.authorize(request);
    case "/token":
      return idp.token(request);
    case "/userinfo":
      return idp.userinfo(request);
    case "/jwks":
      return idp.jwks();
    default:
      return new Response("Not found", { status: 404 });
  }
};
const opts = { [oauth.customFetch]: idpFetch, [oauth.allowInsecureRequests]: true };

const client: oauth.Client = { client_id: DEMO_CLIENT_ID };
const clientAuth = oauth.ClientSecretBasic(DEMO_CLIENT_SECRET);
let as: oauth.AuthorizationServer;

before(async () => {
  const issuer = new URL(demoIssuer());
  as = await oauth.processDiscoveryResponse(issuer, await oauth.discoveryRequest(issuer, opts));
});

async function authorizeUrl(extra: Record<string, string> = {}) {
  const verifier = oauth.generateRandomCodeVerifier();
  const state = oauth.generateRandomState();
  const nonce = oauth.generateRandomNonce();
  const url = new URL(as.authorization_endpoint!);
  const params = {
    client_id: DEMO_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid profile email",
    code_challenge: await oauth.calculatePKCECodeChallenge(verifier),
    code_challenge_method: "S256",
    state,
    nonce,
    ...extra,
  };
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return { url, verifier, state, nonce };
}

async function authorizeAs(email: string) {
  const flow = await authorizeUrl({ login_hint: email });
  const response = await idp.authorize(new Request(flow.url));
  assert.equal(response.status, 303);
  const callback = new URL(response.headers.get("location")!);
  return { ...flow, callback };
}

describe("demo OIDC provider", () => {
  it("publishes discovery metadata for the code + PKCE flow", () => {
    assert.equal(as.issuer, "http://idp.test/demo-idp");
    assert.deepEqual(as.code_challenge_methods_supported, ["S256"]);
    assert.deepEqual(as.response_types_supported, ["code"]);
    assert.equal(as.jwks_uri, "http://idp.test/demo-idp/jwks");
  });

  it("runs a full authorization-code flow and issues Entra-shaped, signed ID tokens", async () => {
    const { callback, verifier, state, nonce } = await authorizeAs(persona.email);
    assert.equal(callback.origin + callback.pathname, REDIRECT_URI);

    const params = oauth.validateAuthResponse(as, client, callback, state);
    const response = await oauth.authorizationCodeGrantRequest(
      as, client, clientAuth, params, REDIRECT_URI, verifier, opts,
    );
    const result = await oauth.processAuthorizationCodeResponse(as, client, response, {
      expectedNonce: nonce,
      requireIdToken: true,
    });

    const claims = oauth.getValidatedIdTokenClaims(result)!;
    assert.equal(claims.iss, as.issuer);
    assert.equal(claims.aud, DEMO_CLIENT_ID);
    assert.equal(claims.sub, persona.id);
    assert.equal(claims.oid, persona.id);
    assert.equal(claims.tid, DEMO_TENANT_ID);
    assert.deepEqual(claims.roles, [persona.role]);
    assert.equal(claims.email, persona.email);

    const keys = (await (await idp.jwks()).json()) as { keys: [] };
    const verified = await jwtVerify(result.id_token!, createLocalJWKSet(keys), {
      issuer: as.issuer,
      audience: DEMO_CLIENT_ID,
    });
    assert.equal(verified.protectedHeader.alg, "RS256");

    const userinfo = await oauth.processUserInfoResponse(
      as, client, claims.sub,
      await oauth.userInfoRequest(as, client, result.access_token, opts),
    );
    assert.equal(userinfo.tid, DEMO_TENANT_ID);
    assert.deepEqual(userinfo.roles, [persona.role]);
  });

  it("rejects a token request with the wrong PKCE verifier", async () => {
    const { callback } = await authorizeAs(persona.email);
    const response = await idp.token(
      new Request(as.token_endpoint!, {
        method: "POST",
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: callback.searchParams.get("code")!,
          redirect_uri: REDIRECT_URI,
          code_verifier: oauth.generateRandomCodeVerifier(),
          client_id: DEMO_CLIENT_ID,
          client_secret: DEMO_CLIENT_SECRET,
        }),
      }),
    );
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "invalid_grant" });
  });

  it("rejects a token request with the wrong client secret", async () => {
    const { callback, verifier } = await authorizeAs(persona.email);
    const params = oauth.validateAuthResponse(as, client, callback, oauth.skipStateCheck);
    const response = await oauth.authorizationCodeGrantRequest(
      as, client, oauth.ClientSecretBasic("wrong"), params, REDIRECT_URI, verifier, opts,
    );
    assert.equal(response.status, 401);
  });

  it("refuses to redirect to an unregistered redirect_uri", async () => {
    const { url } = await authorizeUrl({ redirect_uri: "https://evil.test/steal", login_hint: persona.email });
    const response = await idp.authorize(new Request(url));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("location"), null);
  });

  it("requires PKCE", async () => {
    const { url, state } = await authorizeUrl({ login_hint: persona.email });
    url.searchParams.delete("code_challenge");
    const callback = new URL((await idp.authorize(new Request(url))).headers.get("location")!);
    assert.equal(callback.searchParams.get("error"), "invalid_request");
    assert.equal(callback.searchParams.get("state"), state);
  });

  it("shows the account picker without a login_hint, and honours prompt=none", async () => {
    const { url } = await authorizeUrl();
    const picker = await idp.authorize(new Request(url));
    assert.match(picker.headers.get("location")!, /^\/demo-idp\/login\?/);

    url.searchParams.set("prompt", "none");
    const silent = new URL((await idp.authorize(new Request(url))).headers.get("location")!);
    assert.equal(silent.searchParams.get("error"), "login_required");
  });

  it("accepts the picker's POST and returns a code", async () => {
    const { url } = await authorizeUrl();
    const body = new URLSearchParams(url.searchParams);
    body.set("persona", persona.id);
    const response = await idp.authorize(
      new Request("http://idp.test/demo-idp/authorize", { method: "POST", body }),
    );
    assert.ok(new URL(response.headers.get("location")!).searchParams.get("code"));
  });

  it("is disabled outside demo mode", async () => {
    process.env.DEMO_MODE = "false";
    try {
      const response = await idp.demoOnly(idp.discovery)();
      assert.equal(response.status, 404);
    } finally {
      process.env.DEMO_MODE = "true";
    }
  });
});
