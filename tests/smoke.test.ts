import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import pg from "pg";
import { hasRole } from "../packages/kit/auth/roles.ts";
import { DEMO_PROVIDER_ID } from "../packages/kit/demo/idp/config.ts";
import { DEMO_AUTH_SECRET } from "../packages/kit/demo/mode.ts";
import { DEMO_PERSONAS, type DemoPersona } from "../packages/kit/demo/personas.ts";
import { ROOT, loadApps, type KitApp } from "./apps.ts";

/**
 * Boots the production build of every app under apps/ (`npm run build` first) and drives it over
 * HTTP: the real demo OIDC sign-in for each persona, then every static page and route handler,
 * checking the role gates found in the source give 200 or 403. Finally it boots each app outside
 * demo mode and checks the mock IdP and demo sessions are locked out. With TEST_DATABASE_URL set,
 * apps with a `db:migrate` script also run against a fresh `smoke_<app>` database on that server.
 */

const NEXT_BIN = join(ROOT, "node_modules", ".bin", "next");
const BOOT_TIMEOUT_MS = 60_000;

class Client {
  private cookies = new Map<string, string>();
  readonly base: string;
  constructor(base: string) {
    this.base = base;
  }

  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const url = new URL(path, this.base);
    const headers = new Headers(init.headers);
    if (url.origin === this.base && this.cookies.size) {
      headers.set("cookie", [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; "));
    }
    const response = await fetch(url, { ...init, headers, redirect: "manual" });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair, ...attributes] = cookie.split(";");
      const split = pair.indexOf("=");
      const name = pair.slice(0, split).trim();
      const value = pair.slice(split + 1).trim();
      const expired = attributes.some((a) => /^\s*max-age=0\s*$/i.test(a) || /^\s*expires=thu, 01 jan 1970/i.test(a));
      if (!value || expired) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    return response;
  }

  cookie(name: string): string | undefined {
    return this.cookies.get(name);
  }

  setCookie(name: string, value: string) {
    this.cookies.set(name, value);
  }
}

function location(response: Response): URL {
  const value = response.headers.get("location");
  assert.ok(value, `expected a redirect, got ${response.status}`);
  return new URL(value, response.url);
}

/** Auth.js sign-in → mock Entra /authorize (persona picked via login_hint) → callback. */
async function signIn(client: Client, persona: DemoPersona): Promise<void> {
  const { csrfToken } = (await (await client.fetch("/api/auth/csrf")).json()) as { csrfToken: string };
  const start = await client.fetch(`/api/auth/signin/${DEMO_PROVIDER_ID}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, callbackUrl: `${client.base}/` }),
  });
  const authorize = location(start);
  assert.equal(authorize.pathname, "/demo-idp/authorize");
  authorize.searchParams.set("login_hint", persona.email);

  const callback = location(await client.fetch(authorize.toString()));
  assert.equal(callback.pathname, `/api/auth/callback/${DEMO_PROVIDER_ID}`);
  assert.ok(callback.searchParams.get("code"), `IdP returned ${callback.search}`);

  const done = await client.fetch(callback.pathname + callback.search);
  assert.equal(location(done).pathname, "/", "callback should land on the dashboard, not the sign-in error page");
  assert.ok(sessionCookie(client), "no session cookie after sign-in");
}

const sessionCookie = (client: Client) => client.cookie("authjs.session-token");

async function boot(app: KitApp, env: Record<string, string>): Promise<{ base: string; stop: () => Promise<void> }> {
  const base = `http://localhost:${app.port}`;
  const child: ChildProcess = spawn(NEXT_BIN, ["start", "-p", String(app.port)], {
    cwd: app.dir,
    env: { ...process.env, PORT: String(app.port), AUTH_TRUST_HOST: "true", ...env },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  let output = "";
  child.stdout?.on("data", (chunk) => (output += chunk));
  child.stderr?.on("data", (chunk) => (output += chunk));

  const stop = () =>
    new Promise<void>((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once("exit", () => resolve());
      process.kill(-child.pid!, "SIGTERM");
    });

  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`apps/${app.name} exited early:\n${output}`);
    try {
      if ((await fetch(`${base}/signin`, { redirect: "manual" })).status < 500) return { base, stop };
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  await stop();
  throw new Error(`apps/${app.name} did not start on ${base}:\n${output}`);
}

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

/** Recreates `smoke_<app>` next to TEST_DATABASE_URL, so runs don't depend on what other tests left behind. */
async function freshDatabase(app: KitApp): Promise<string> {
  const name = `smoke_${app.name.replace(/\W/g, "_")}`;
  const admin = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${name}`);
  } finally {
    await admin.end();
  }
  const url = new URL(TEST_DATABASE_URL!);
  url.pathname = `/${name}`;
  return url.toString();
}

interface Mode {
  name: string;
  /** Package script the app needs for this mode to apply. */
  script: string;
  env: (app: KitApp) => Record<string, string> | Promise<Record<string, string>>;
}

const MODES: Mode[] = [
  { name: "demo mode", script: "dev:demo", env: () => ({ DEMO_MODE: "true" }) },
  {
    name: "demo mode with mock Dataverse",
    script: "dev:demo:dataverse",
    env: () => ({ DEMO_MODE: "true", DATAVERSE_ENABLED: "true" }),
  },
  ...(TEST_DATABASE_URL
    ? [
        {
          name: "demo mode on PostgreSQL",
          script: "db:migrate",
          env: async (app: KitApp) => {
            const DATABASE_URL = await freshDatabase(app);
            execFileSync("npm", ["run", "db:migrate", "--", "--seed"], {
              cwd: app.dir,
              env: { ...process.env, DATABASE_URL },
              stdio: "pipe",
            });
            return { DEMO_MODE: "true", DATABASE_URL };
          },
        },
      ]
    : []),
];

for (const app of loadApps()) {
  const routes = app.routes.filter((route) => !route.public && !route.dynamic);
  const built = existsSync(join(app.dir, ".next", "BUILD_ID"));

  describe(`apps/${app.name}`, () => {
    if (!built) {
      it("has a production build", () => assert.fail(`apps/${app.name} is not built: run \`npm run build\` first`));
      return;
    }
    let demoSession: string | undefined;

    for (const mode of MODES.filter((m) => app.pkg.scripts?.[m.script])) {
      describe(mode.name, () => {
        let server: Awaited<ReturnType<typeof boot>>;
        before(async () => (server = await boot(app, await mode.env(app))));
        after(() => server?.stop());

        it(`serves the ${app.displayName} sign-in page with every persona`, async () => {
          const response = await new Client(server.base).fetch("/signin");
          assert.equal(response.status, 200);
          const html = await response.text();
          assert.ok(html.includes(app.displayName), `sign-in page should show "${app.displayName}"`);
          for (const persona of DEMO_PERSONAS) assert.ok(html.includes(persona.name), `missing ${persona.name}`);
        });

        it("redirects signed-out users to /signin from every page", async () => {
          const client = new Client(server.base);
          for (const route of routes) {
            const response = await client.fetch(route.path);
            assert.equal(response.status, 307, `${route.path} answered ${response.status} while signed out`);
            assert.equal(location(response).pathname, "/signin", route.path);
          }
        });

        it("answers public API routes without a session", async () => {
          const client = new Client(server.base);
          for (const route of app.routes.filter((r) => r.public && r.path.startsWith("/api/") && !r.dynamic)) {
            if (!/export\s+(async\s+function|const)\s+GET\b/.test(route.source)) continue;
            const response = await client.fetch(route.path);
            assert.equal(response.status, 200, `${route.path} answered ${response.status}`);
          }
        });

        for (const persona of DEMO_PERSONAS) {
          it(`${persona.name} signs in and gets exactly the routes ${persona.role} allows`, async () => {
            const client = new Client(server.base);
            await signIn(client, persona);
            demoSession ??= sessionCookie(client);

            const home = await client.fetch("/");
            assert.equal(home.status, 200);
            assert.ok((await home.text()).includes(persona.name), "dashboard should show the signed-in persona");

            for (const route of routes) {
              const allowed = hasRole([persona.role], route.minRole!);
              const response = await client.fetch(route.path);
              assert.equal(
                response.status,
                allowed ? 200 : 403,
                `${persona.role} on ${route.path} (needs ${route.minRole}) answered ${response.status}`,
              );
            }
          });
        }
      });
    }

    describe("outside demo mode", () => {
      let server: Awaited<ReturnType<typeof boot>>;
      before(
        async () =>
          (server = await boot(app, {
            DEMO_MODE: "false",
            DATAVERSE_ENABLED: "false",
            ENTRA_TENANT_ID: "00000000-0000-4000-8000-000000000000",
            ENTRA_CLIENT_ID: "smoke-test-client",
            ENTRA_CLIENT_SECRET: "smoke-test-secret",
            // Same key as demo mode, so the demo session below decrypts and the tenant check has to reject it.
            AUTH_SECRET: DEMO_AUTH_SECRET,
          })),
      );
      after(() => server?.stop());

      it("hides the mock IdP", async () => {
        const client = new Client(server.base);
        for (const path of ["/demo-idp/.well-known/openid-configuration", "/demo-idp/jwks", "/demo-idp/authorize"]) {
          assert.equal((await client.fetch(path)).status, 404, path);
        }
      });

      it("rejects a session minted in demo mode", async () => {
        assert.ok(demoSession, "needs a session from the demo-mode run");
        const client = new Client(server.base);
        client.setCookie("authjs.session-token", demoSession);
        for (const route of routes) {
          const response = await client.fetch(route.path);
          assert.equal(response.status, 307, `${route.path} answered ${response.status} for a demo session`);
          assert.equal(location(response).pathname, "/signin", route.path);
        }
      });
    });
  });
}
