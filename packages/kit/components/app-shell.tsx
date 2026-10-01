import type { ReactNode } from "react";
import { forbidden, redirect } from "next/navigation";
import { auth } from "@kit/auth";
import { UserMenu } from "@kit/components/user-menu";
import { DemoBanner } from "@kit/demo/banner";
import { isDemoMode } from "@kit/demo/mode";
import { currentActor } from "@kit/services/authz";
import { Logo } from "@kit/ui/logo";

/** Authenticated layout: sidebar with `nav`, demo banner, header with the user menu. 403s users without a role. */
export async function AppShell({ nav, appName, children }: { nav: ReactNode; appName?: string; children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const actor = await currentActor();
  if (actor.roles.length === 0) forbidden();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 md:flex">
        <Logo className="px-2" name={appName} />
        <nav className="mt-8 space-y-1">{nav}</nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {isDemoMode() && <DemoBanner />}
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <Logo className="md:hidden" name={appName} />
          <div className="hidden md:block" />
          <UserMenu user={{ ...session.user, roles: actor.roles }} />
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
