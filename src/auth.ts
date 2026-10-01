import NextAuth, { type DefaultSession } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { entraIssuer, isFromTenant } from "@/lib/entra";
import { parseRoles, type Role } from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      roles: Role[];
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    oid?: string;
    tid?: string;
    roles?: Role[];
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const tenantId = requireEnv("ENTRA_TENANT_ID");

  return {
    providers: [
      MicrosoftEntraID({
        clientId: requireEnv("ENTRA_CLIENT_ID"),
        clientSecret: requireEnv("ENTRA_CLIENT_SECRET"),
        issuer: entraIssuer(tenantId),
      }),
    ],
    session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
    pages: { signIn: "/signin", error: "/signin" },
    callbacks: {
      signIn({ profile }) {
        if (!profile || !isFromTenant(profile.tid, tenantId)) return false;
        return parseRoles(profile.roles).length > 0;
      },
      jwt({ token, profile }) {
        if (profile) {
          token.oid = typeof profile.oid === "string" ? profile.oid : undefined;
          token.tid = typeof profile.tid === "string" ? profile.tid : undefined;
          token.roles = parseRoles(profile.roles);
        }
        delete token.picture;
        return token;
      },
      session({ session, token }) {
        session.user.id = token.oid ?? token.sub ?? "";
        session.user.tenantId = token.tid ?? "";
        session.user.roles = token.roles ?? [];
        return session;
      },
      authorized({ auth }) {
        return !!auth?.user;
      },
    },
  };
});
