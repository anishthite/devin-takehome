import { SignJWT, base64url, jwtVerify, type JWTPayload } from "jose";
import { DEMO_TENANT_ID, isDemoMode } from "../mode.ts";
import { findPersona, findPersonaByEmail, type DemoPersona } from "../personas.ts";
import {
  DEMO_CALLBACK_PATH,
  DEMO_CLIENT_ID,
  DEMO_CLIENT_SECRET,
  demoBrowserBase,
  demoIssuer,
} from "./config.ts";
import { SIGNING_ALG, SIGNING_KID, signingKey } from "./keys.ts";

/**
 * Minimal OpenID Connect provider that mimics a single-tenant Microsoft Entra app:
 * authorization-code flow with mandatory PKCE (S256), RS256 ID tokens carrying
 * Entra's `oid`, `tid` and `roles` claims, userinfo and JWKS. Codes are short-lived
 * signed JWTs so the IdP is stateless.
 */

const CODE_TTL_SECONDS = 60;
const TOKEN_TTL_SECONDS = 60 * 60;
const CODE_TYP = "demo-code+jwt";
const ACCESS_TOKEN_TYP = "at+jwt";

interface CodeClaims extends JWTPayload {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  scope: string;
  nonce?: string;
}

const noStore = { "Cache-Control": "no-store", Pragma: "no-cache" };

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...noStore, ...headers } });
}

function redirect(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location, ...noStore } });
}

export function demoOnly<A extends unknown[]>(
  handler: (...args: A) => Response | Promise<Response>,
): (...args: A) => Response | Promise<Response> {
  return (...args) => (isDemoMode() ? handler(...args) : new Response("Not found", { status: 404 }));
}

export function profileClaims(persona: DemoPersona) {
  return {
    name: persona.name,
    email: persona.email,
    preferred_username: persona.email,
    oid: persona.id,
    tid: DEMO_TENANT_ID,
    roles: [persona.role],
    ver: "2.0",
  };
}

export function discovery(): Response {
  const issuer = demoIssuer();
  return json({
    issuer,
    authorization_endpoint: `${demoBrowserBase()}/authorize`,
    token_endpoint: `${issuer}/token`,
    userinfo_endpoint: `${issuer}/userinfo`,
    jwks_uri: `${issuer}/jwks`,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: [SIGNING_ALG],
    scopes_supported: ["openid", "profile", "email"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    code_challenge_methods_supported: ["S256"],
    claims_supported: [
      ...["sub", "iss", "aud", "exp", "iat", "nonce"],
      ...["name", "email", "preferred_username", "oid", "tid", "roles", "ver"],
    ],
    authorization_response_iss_parameter_supported: true,
  });
}

export async function jwks(): Promise<Response> {
  const { publicJwk } = await signingKey();
  return json({ keys: [publicJwk] });
}

function allowedRedirect(value: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const http = url.protocol === "http:" || url.protocol === "https:";
    return http && url.pathname === DEMO_CALLBACK_PATH && !url.search && !url.hash ? url : null;
  } catch {
    return null;
  }
}

export async function authorize(request: Request): Promise<Response> {
  const params =
    request.method === "POST" ? new URLSearchParams(await request.text()) : new URL(request.url).searchParams;

  const redirectUri = allowedRedirect(params.get("redirect_uri"));
  if (params.get("client_id") !== DEMO_CLIENT_ID || !redirectUri) {
    return new Response("Unknown client_id or redirect_uri", { status: 400, headers: noStore });
  }

  const issuer = demoIssuer();
  const respond = (result: Record<string, string>) => {
    const url = new URL(redirectUri);
    for (const [key, value] of Object.entries(result)) url.searchParams.set(key, value);
    const state = params.get("state");
    if (state) url.searchParams.set("state", state);
    url.searchParams.set("iss", issuer);
    return redirect(url.toString());
  };

  if (params.get("response_type") !== "code") return respond({ error: "unsupported_response_type" });
  const scope = params.get("scope") ?? "";
  if (!scope.split(" ").includes("openid")) return respond({ error: "invalid_scope" });
  const codeChallenge = params.get("code_challenge");
  if (!codeChallenge || params.get("code_challenge_method") !== "S256") {
    return respond({ error: "invalid_request", error_description: "PKCE with S256 is required" });
  }

  const persona = findPersona(params.get("persona")) ?? findPersonaByEmail(params.get("login_hint"));
  if (!persona) {
    if (params.get("prompt") === "none") return respond({ error: "login_required" });
    const picker = new URLSearchParams(params);
    picker.delete("persona");
    picker.delete("login_hint");
    return redirect(`/demo-idp/login?${picker}`);
  }

  const { privateKey } = await signingKey();
  const code = await new SignJWT({
    client_id: DEMO_CLIENT_ID,
    redirect_uri: redirectUri.toString(),
    code_challenge: codeChallenge,
    scope,
    nonce: params.get("nonce") ?? undefined,
  } satisfies Omit<CodeClaims, keyof JWTPayload>)
    .setProtectedHeader({ alg: SIGNING_ALG, kid: SIGNING_KID, typ: CODE_TYP })
    .setIssuer(issuer)
    .setAudience(`${issuer}/token`)
    .setSubject(persona.id)
    .setIssuedAt()
    .setExpirationTime(`${CODE_TTL_SECONDS}s`)
    .sign(privateKey);

  return respond({ code });
}

function clientCredentials(request: Request, body: URLSearchParams): { id: string; secret: string } | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const split = decoded.indexOf(":");
    if (split < 0) return null;
    return {
      id: decodeURIComponent(decoded.slice(0, split)),
      secret: decodeURIComponent(decoded.slice(split + 1)),
    };
  }
  const id = body.get("client_id");
  const secret = body.get("client_secret");
  return id && secret ? { id, secret } : null;
}

async function pkceMatches(verifier: string | null, challenge: string): Promise<boolean> {
  if (!verifier) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url.encode(new Uint8Array(digest)) === challenge;
}

export async function token(request: Request): Promise<Response> {
  const body = new URLSearchParams(await request.text());
  const client = clientCredentials(request, body);
  if (client?.id !== DEMO_CLIENT_ID || client.secret !== DEMO_CLIENT_SECRET) {
    return json({ error: "invalid_client" }, 401, { "WWW-Authenticate": 'Basic realm="demo-idp"' });
  }
  if (body.get("grant_type") !== "authorization_code") return json({ error: "unsupported_grant_type" }, 400);

  const issuer = demoIssuer();
  const { privateKey, publicKey } = await signingKey();

  let code: CodeClaims;
  try {
    ({ payload: code } = await jwtVerify<CodeClaims>(body.get("code") ?? "", publicKey, {
      issuer,
      audience: `${issuer}/token`,
      typ: CODE_TYP,
    }));
  } catch {
    return json({ error: "invalid_grant", error_description: "Invalid or expired code" }, 400);
  }

  const persona = findPersona(code.sub);
  const valid =
    persona &&
    code.client_id === client.id &&
    code.redirect_uri === body.get("redirect_uri") &&
    (await pkceMatches(body.get("code_verifier"), code.code_challenge));
  if (!valid) return json({ error: "invalid_grant" }, 400);

  const idToken = await new SignJWT({ ...profileClaims(persona), nonce: code.nonce })
    .setProtectedHeader({ alg: SIGNING_ALG, kid: SIGNING_KID, typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(client.id)
    .setSubject(persona.id)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(privateKey);

  const accessToken = await new SignJWT({ scope: code.scope, client_id: client.id })
    .setProtectedHeader({ alg: SIGNING_ALG, kid: SIGNING_KID, typ: ACCESS_TOKEN_TYP })
    .setIssuer(issuer)
    .setAudience(`${issuer}/userinfo`)
    .setSubject(persona.id)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(privateKey);

  return json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: TOKEN_TTL_SECONDS,
    scope: code.scope,
    id_token: idToken,
  });
}

export async function userinfo(request: Request): Promise<Response> {
  const unauthorized = () =>
    json({ error: "invalid_token" }, 401, { "WWW-Authenticate": 'Bearer error="invalid_token"' });

  const accessToken = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!accessToken) return unauthorized();

  const issuer = demoIssuer();
  const { publicKey } = await signingKey();
  try {
    const { payload } = await jwtVerify(accessToken, publicKey, {
      issuer,
      audience: `${issuer}/userinfo`,
      typ: ACCESS_TOKEN_TYP,
    });
    const persona = findPersona(payload.sub);
    if (!persona) return unauthorized();
    return json({ sub: persona.id, ...profileClaims(persona) });
  } catch {
    return unauthorized();
  }
}
