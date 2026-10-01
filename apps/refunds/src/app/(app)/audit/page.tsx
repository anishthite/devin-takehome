import { Download } from "lucide-react";
import { hasRole } from "@kit/auth/roles";
import { fromAuditLog } from "@kit/services/audit-reader";
import { requireRole } from "@kit/services/authz";
import { Button } from "@kit/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { PageHeader } from "@kit/ui/page-header";
import { AuditTimeline } from "@/components/audit-timeline";
import { getRefunds } from "@/lib/refunds/server";

export default async function AuditPage() {
  const actor = await requireRole("Ledger.Approver");
  const entries = (await (await getRefunds()).activity()).map(fromAuditLog);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Audit log"
        description="Append-only record of every refund request, decision and payout, from the kit's audit_log."
        actions={
          hasRole(actor.roles, "Ledger.Admin") && (
            <Button asChild size="sm" variant="outline">
              <a href="/audit/export" download>
                <Download />
                Export CSV
              </a>
            </Button>
          )
        }
      />
      <Card className="gap-0 overflow-hidden pb-0">
        <CardHeader className="pb-4">
          <CardTitle>Refund activity</CardTitle>
          <CardDescription>{entries.length} entries, newest first</CardDescription>
        </CardHeader>
        <AuditTimeline entries={entries} showTarget />
      </Card>
    </div>
  );
}
