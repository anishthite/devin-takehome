import { forbidden, redirect } from "next/navigation";
import { ArrowLeftRight, CheckCircle2, History, LayoutDashboard, Settings } from "lucide-react";
import { auth } from "@/auth";
import { NavLink } from "@/components/nav-link";
import { DemoBanner } from "@/demo/banner";
import { isDemoMode } from "@/demo/mode";
import { UserMenu } from "@/components/user-menu";
import { currentActor } from "@/lib/kit/authz";
import { hasRole } from "@/lib/roles";
import { Badge } from "@/ui-components/badge";
import { Logo } from "@/ui-components/logo";

const SOON = [
  { label: "Ledger", icon: ArrowLeftRight },
  { label: "Settings", icon: Settings },
];

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const actor = await currentActor();
  if (actor.roles.length === 0) forbidden();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 md:flex">
        <Logo className="px-2" />
        <nav className="mt-8 space-y-1">
          <NavLink href="/">
            <LayoutDashboard />
            Dashboard
          </NavLink>
          <NavLink href="/approvals">
            <CheckCircle2 />
            Approvals
          </NavLink>
          {hasRole(actor.roles, "Ledger.Approver") && (
            <NavLink href="/audit">
              <History />
              Audit
            </NavLink>
          )}
          {SOON.map(({ label, icon: Icon }) => (
            <span
              key={label}
              aria-disabled
              className="flex h-9 cursor-not-allowed items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground/70"
            >
              <Icon className="size-4" />
              {label}
              <Badge variant="secondary" className="ml-auto text-[10px] tracking-wide uppercase">
                Soon
              </Badge>
            </span>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {isDemoMode() && <DemoBanner />}
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <Logo className="md:hidden" />
          <div className="hidden md:block" />
          <UserMenu user={{ ...session.user, roles: actor.roles }} />
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
