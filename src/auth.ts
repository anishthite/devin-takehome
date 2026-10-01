import NextAuth, { type DefaultSession } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { DEMO_AUTH_SECRET, DEMO_TENANT_ID, isDemoMode } from "@/demo/mode";
import { findPersona } from "@/demo/personas";
import { DEMO_PROVIDER_ID, DemoProvider } from "@/demo/provider";
import { isDataverseEnabled } from "@/lib/dataverse/config";
import { entraIssuer, isFromTenant } from "@/lib/entra";
import { parseRoles, type Role } from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /** Random per-sign-in id; scopes per-session caches such as resolved roles. */
      sessionId: string;
      tenantId: string;
      roles: Role[];
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    oid?: string;
    sid?: string;
    tid?: string;
    roles?: Role[];
  }
}

export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function entraProvider() {
  return MicrosoftEntraID({
    clientId: requireEnv("ENTRA_CLIENT_ID"),
    clientSecret: requireEnv("ENTRA_CLIENT_SECRET"),
    issuer: entraIssuer(requireEnv("ENTRA_TENANT_ID")),
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const demo = isDemoMode();
  const tenantId = demo ? DEMO_TENANT_ID : requireEnv("ENTRA_TENANT_ID");

  return {
    providers: [demo ? DemoProvider() : entraProvider()],
    secret: demo ? (process.env.AUTH_SECRET ?? DEMO_AUTH_SECRET) : process.env.AUTH_SECRET,
    session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
    pages: { signIn: "/signin", error: "/signin" },
    callbacks: {
      signIn({ account, profile }) {
        if (account?.provider === DEMO_PROVIDER_ID) return demo;
        if (!profile || !isFromTenant(profile.tid, tenantId)) return false;
        // With Dataverse enabled, roles come from Dataverse security roles and are checked per request.
        return isDataverseEnabled() || parseRoles(profile.roles).length > 0;
      },
      jwt({ token, account, profile, user }) {
        if (account) token.sid = crypto.randomUUID();
        if (account?.provider === DEMO_PROVIDER_ID) {
          const persona = findPersona(user?.id);
          token.oid = persona?.id;
          token.tid = DEMO_TENANT_ID;
          token.roles = persona ? [persona.role] : [];
        } else if (profile) {
          token.oid = typeof profile.oid === "string" ? profile.oid : undefined;
          token.tid = typeof profile.tid === "string" ? profile.tid : undefined;
          token.roles = parseRoles(profile.roles);
        }
        delete token.picture;
        return token;
      },
      session({ session, token }) {
        session.user.id = token.oid ?? token.sub ?? "";
        session.user.sessionId = token.sid ?? "";
        session.user.tenantId = token.tid ?? "";
        session.user.roles = token.roles ?? [];
        return session;
      },
      authorized({ auth }) {
        if (!auth?.user) return false;
        return demo === (auth.user.tenantId === DEMO_TENANT_ID);
      },
    },
  };
});
