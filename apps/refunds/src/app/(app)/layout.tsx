import { History, LayoutDashboard, PlusCircle, ReceiptText } from "lucide-react";
import { hasRole } from "@kit/auth/roles";
import { AppShell } from "@kit/components/app-shell";
import { NavLink } from "@kit/components/nav-link";
import { currentActor } from "@kit/services/authz";

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
          <NavLink href="/refunds">
            <ReceiptText />
            Refunds
          </NavLink>
          {hasRole(actor.roles, "Ledger.Operator") && (
            <NavLink href="/refunds/new">
              <PlusCircle />
              New refund
            </NavLink>
          )}
          {hasRole(actor.roles, "Ledger.Approver") && (
            <NavLink href="/audit">
              <History />
              Audit log
            </NavLink>
          )}
        </>
      }
    >
      {children}
    </AppShell>
  );
}
