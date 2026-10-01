import { ArrowLeftRight, CheckCircle2, History, LayoutDashboard, Settings } from "lucide-react";
import { hasRole } from "@kit/auth/roles";
import { AppShell } from "@kit/components/app-shell";
import { NavLink } from "@kit/components/nav-link";
import { currentActor } from "@kit/services/authz";
import { Badge } from "@kit/ui/badge";

const SOON = [
  { label: "Ledger", icon: ArrowLeftRight },
  { label: "Settings", icon: Settings },
];

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const actor = await currentActor();

  return (
    <AppShell
      nav={
        <>
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
        </>
      }
    >
      {children}
    </AppShell>
  );
}
