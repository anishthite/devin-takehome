import { CheckCircle2, History, Users } from "lucide-react";
import { hasRole } from "@kit/auth/roles";
import { AppShell } from "@kit/components/app-shell";
import { NavLink } from "@kit/components/nav-link";
import { currentActor } from "@kit/services/authz";
import { Badge } from "@kit/ui/badge";
import { getAdjustments } from "@/lib/adjustments/runtime";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const actor = await currentActor();
  const { service } = await getAdjustments();
  const pending = (await service.listRequests()).filter((r) => r.status === "pending").length;

  return (
    <AppShell
      appName="Adjustments"
      nav={
        <>
          <NavLink href="/">
            <Users />
            Customers
          </NavLink>
          <NavLink href="/approvals">
            <CheckCircle2 />
            Approvals
            {pending > 0 && (
              <Badge variant="warning" className="ml-auto">
                {pending}
              </Badge>
            )}
          </NavLink>
          {hasRole(actor.roles, "Ledger.Approver") && (
            <NavLink href="/audit">
              <History />
              Audit
            </NavLink>
          )}
        </>
      }
    >
      {children}
    </AppShell>
  );
}
