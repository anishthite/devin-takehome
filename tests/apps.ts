import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { ROLES, type Role } from "../packages/kit/auth/roles.ts";

export const ROOT = new URL("..", import.meta.url).pathname;
export const APPS_DIR = join(ROOT, "apps");

/** Proxy matcher exclusions every kit app needs; anything else it excludes is a public route. */
export const KIT_PUBLIC_PREFIXES = ["api/auth", "signin", "demo-idp", "_next/static", "_next/image", "favicon.ico"];

export interface PackageJson {
  name: string;
  type?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
}

export interface AppRoute {
  /** URL path with route groups removed, e.g. `/refunds/new`. */
  path: string;
  file: string;
  kind: "page" | "route";
  source: string;
  dynamic: boolean;
  /** Public per the proxy matcher (sign-in, auth callbacks, mock IdP, extra public API routes). */
  public: boolean;
  /** First role gate in the file; `Ledger.Viewer` for `currentActor()` only; null when ungated. */
  minRole: Role | null;
}

export interface KitApp {
  name: string;
  dir: string;
  pkg: PackageJson;
  port: number;
  displayName: string;
  proxySource: string | null;
  publicPrefixes: string[];
  routes: AppRoute[];
}

export const read = (file: string) => readFileSync(file, "utf8");

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

export function sourceFiles(dir: string): string[] {
  return walk(dir).filter((file) => /\.(ts|tsx)$/.test(file));
}

/** Port from `-p N` / `PORT=N` in a script; Next.js defaults to 3000. */
export function scriptPort(script: string | undefined): number | null {
  if (!script?.includes("next ")) return null;
  const match = script.match(/(?:-p|--port)\s+(\d+)/) ?? script.match(/\bPORT=(\d+)/);
  return match ? Number(match[1]) : 3000;
}

export function proxyPublicPrefixes(proxySource: string): string[] {
  const lookahead = proxySource.match(/\(\?!([^)]*)\)/);
  return lookahead ? lookahead[1].split("|").map((prefix) => prefix.trim()) : [];
}

export function minRoleOf(source: string): Role | null {
  const required = source.match(/requireRole\(\s*["'`]([\w.]+)["'`]/)?.[1];
  if (required) return (ROLES as readonly string[]).includes(required) ? (required as Role) : null;
  return /\bcurrentActor\(\)/.test(source) ? "Ledger.Viewer" : null;
}

function isPublic(path: string, prefixes: string[]): boolean {
  const bare = path.replace(/^\//, "");
  return prefixes.some((prefix) => bare === prefix || bare.startsWith(`${prefix}/`) || bare.startsWith(`${prefix}.`));
}

function routesOf(dir: string, publicPrefixes: string[]): AppRoute[] {
  const appDir = join(dir, "src", "app");
  return sourceFiles(appDir)
    .filter((file) => /[/\\](page\.tsx|route\.ts)$/.test(file))
    .map((file) => {
      const segments = relative(appDir, file).split(sep).slice(0, -1);
      const path = `/${segments.filter((segment) => !/^\(.*\)$/.test(segment)).join("/")}`;
      const source = read(file);
      return {
        path,
        file,
        kind: file.endsWith("route.ts") ? ("route" as const) : ("page" as const),
        source,
        dynamic: segments.some((segment) => segment.startsWith("[")),
        public: isPublic(path, publicPrefixes),
        minRole: minRoleOf(source),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function loadApp(name: string): KitApp {
  const dir = join(APPS_DIR, name);
  const pkg = JSON.parse(read(join(dir, "package.json"))) as PackageJson;
  const proxyFile = join(dir, "src", "proxy.ts");
  const proxySource = existsSync(proxyFile) ? read(proxyFile) : null;
  const publicPrefixes = proxySource ? proxyPublicPrefixes(proxySource) : [];
  const configFile = join(dir, "next.config.ts");
  const config = existsSync(configFile) ? read(configFile) : "";
  return {
    name,
    dir,
    pkg,
    port: scriptPort(pkg.scripts?.start) ?? 3000,
    displayName: config.match(/KIT_APP_NAME:\s*["'`]([^"'`]+)["'`]/)?.[1] ?? "Ledger",
    proxySource,
    publicPrefixes,
    routes: routesOf(dir, publicPrefixes),
  };
}

/** Every workspace under `apps/`. New apps are picked up automatically. */
export function loadApps(): KitApp[] {
  return readdirSync(APPS_DIR)
    .filter((entry) => existsSync(join(APPS_DIR, entry, "package.json")))
    .sort()
    .map(loadApp);
}
