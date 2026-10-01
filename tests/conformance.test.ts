import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { KIT_PUBLIC_PREFIXES, ROOT, loadApps, read, scriptPort, sourceFiles } from "./apps.ts";

/**
 * Static checks every app under apps/ must pass: workspace wiring, kit auth plumbing and
 * server-side authorization on every page, route handler and server action. New apps are
 * discovered automatically; follow .agents/skills/new-kit-app to satisfy them.
 */

const apps = loadApps();
const rootPkg = JSON.parse(read(join(ROOT, "package.json"))) as { scripts: Record<string, string> };
const rootDoc = (name: string) => read(join(ROOT, name));

const REQUIRED_SCRIPTS = ["dev", "dev:demo", "build", "start", "lint", "typecheck", "test"];
const REQUIRED_FILES = [
  "README.md",
  ".env.example",
  "next.config.ts",
  "tsconfig.json",
  "eslint.config.mjs",
  "src/proxy.ts",
  "src/app/layout.tsx",
  "src/app/forbidden.tsx",
  "src/app/signin/page.tsx",
  "src/app/api/auth/[...nextauth]/route.ts",
  "src/app/demo-idp/.well-known/openid-configuration/route.ts",
  "src/app/demo-idp/authorize/route.ts",
  "src/app/demo-idp/jwks/route.ts",
  "src/app/demo-idp/login/page.tsx",
  "src/app/demo-idp/token/route.ts",
  "src/app/demo-idp/userinfo/route.ts",
];
const GATE = /\b(requireRole|currentActor)\(/;

describe("apps", () => {
  it("discovers every app", () => {
    assert.ok(apps.length > 0);
  });

  it("use unique ports", () => {
    const ports = apps.map((app) => app.port);
    assert.equal(new Set(ports).size, ports.length, `Ports collide: ${apps.map((a) => `${a.name}=${a.port}`).join(", ")}`);
  });

  it("use unique display names (KIT_APP_NAME)", () => {
    const names = apps.map((app) => app.displayName);
    assert.equal(new Set(names).size, names.length, `Set KIT_APP_NAME in next.config.ts: ${names.join(", ")}`);
  });
});

for (const app of apps) {
  const file = (path: string) => join(app.dir, path);

  describe(`apps/${app.name}`, () => {
    describe("workspace", () => {
      it("package.json is named after its folder, is ESM and depends on the kit", () => {
        assert.equal(app.pkg.name, app.name);
        assert.equal(app.pkg.type, "module");
        assert.ok(app.pkg.dependencies?.kit, 'add "kit" to dependencies');
      });

      it("has the standard scripts", () => {
        for (const script of REQUIRED_SCRIPTS) assert.ok(app.pkg.scripts?.[script], `missing script "${script}"`);
        assert.match(app.pkg.scripts!.typecheck, /next typegen && tsc --noEmit/);
        assert.match(app.pkg.scripts!["dev:demo"], /DEMO_MODE=true/);
        assert.match(app.pkg.scripts!.test, /node --test/);
      });

      it("uses one port in every dev/start script", () => {
        for (const [name, script] of Object.entries(app.pkg.scripts ?? {})) {
          if (!/^(dev|start)/.test(name)) continue;
          assert.equal(scriptPort(script), app.port, `script "${name}" should use port ${app.port}`);
        }
      });

      it("has unit tests", () => {
        const tests = sourceFiles(file("tests")).filter((path) => path.endsWith(".test.ts"));
        assert.ok(tests.length > 0, "add tests/*.test.ts");
      });

      it("is built and runnable from the root package.json", () => {
        assert.ok(
          rootPkg.scripts.build.includes(`npm run build -w apps/${app.name}`),
          `append "&& npm run build -w apps/${app.name}" to the root build script`,
        );
        const demo = Object.values(rootPkg.scripts).some((script) =>
          script.includes(`npm run dev:demo -w apps/${app.name}`),
        );
        assert.ok(demo, `add a root script running "npm run dev:demo -w apps/${app.name}"`);
      });

      it("is documented in README.md, ARCHITECTURE.md and DEPLOYMENT.md", () => {
        for (const doc of ["README.md", "ARCHITECTURE.md", "DEPLOYMENT.md"]) {
          assert.ok(rootDoc(doc).includes(`apps/${app.name}`), `mention apps/${app.name} in ${doc}`);
        }
      });
    });

    describe("kit wiring", () => {
      it("has every file the kit needs", () => {
        const missing = REQUIRED_FILES.filter((path) => !existsSync(file(path)));
        assert.deepEqual(missing, [], "copy these from apps/refunds (see .agents/skills/new-kit-app)");
      });

      it("enables authInterrupts so requireRole() can render the 403 page", () => {
        assert.match(read(file("next.config.ts")), /authInterrupts:\s*true/);
      });

      it("protects every route with the kit proxy", () => {
        assert.ok(app.proxySource, "missing src/proxy.ts");
        assert.match(app.proxySource, /export\s*{\s*auth as proxy\s*}\s*from\s*["']@kit\/auth["']/);
        assert.deepEqual(
          KIT_PUBLIC_PREFIXES.filter((prefix) => !app.publicPrefixes.includes(prefix)),
          [],
          "the proxy matcher must exclude the kit's sign-in, auth and mock IdP routes",
        );
      });

      it("only leaves API routes public beyond the kit's own", () => {
        const extra = app.publicPrefixes.filter((prefix) => !KIT_PUBLIC_PREFIXES.includes(prefix));
        for (const prefix of extra) assert.match(prefix, /^api\//, `public prefix "${prefix}" must be under api/`);
        const publicPages = app.routes.filter(
          (route) => route.kind === "page" && route.public && !/^\/(signin|demo-idp)\b/.test(route.path),
        );
        assert.deepEqual(publicPages.map((route) => route.path), []);
      });

      it("wraps every mock IdP endpoint in demoOnly()", () => {
        const handlers = app.routes.filter((route) => route.path.startsWith("/demo-idp") && route.kind === "route");
        assert.ok(handlers.length >= 5);
        for (const route of handlers) {
          assert.match(route.source, /demoOnly\(/, `${route.path} must be wrapped in demoOnly()`);
        }
      });

      it("serves the kit's sign-in page and auth handlers", () => {
        assert.match(read(file("src/app/signin/page.tsx")), /@kit\/auth\/sign-in-page/);
        assert.match(read(file("src/app/api/auth/[...nextauth]/route.ts")), /handlers/);
      });
    });

    describe("authorization", () => {
      it("checks the signed-in user in the (app) layout", () => {
        assert.match(read(file("src/app/(app)/layout.tsx")), GATE);
      });

      for (const route of app.routes.filter((r) => !r.public)) {
        it(`${route.kind} ${route.path} calls requireRole() or currentActor()`, () => {
          assert.ok(route.minRole, `${route.file} must call requireRole("Ledger.<role>") or currentActor()`);
        });
      }

      const actionFiles = sourceFiles(file("src")).filter((path) => /^\s*["']use server["']/.test(read(path)));
      for (const actions of actionFiles) {
        const source = read(actions);
        const exported = [...source.matchAll(/export\s+async\s+function\s+(\w+)/g)];
        for (const [index, match] of exported.entries()) {
          it(`server action ${match[1]} calls requireRole() or currentActor()`, () => {
            const body = source.slice(match.index, exported[index + 1]?.index ?? source.length);
            assert.match(body, GATE, `${actions}: ${match[1]} is callable by anyone who can reach the page`);
          });
        }
      }
    });
  });
}
