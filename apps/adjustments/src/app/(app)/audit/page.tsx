import { APPROVAL_TARGET_TYPE } from "@kit/services/approvals";
import { requireRole } from "@kit/services/authz";
import { getKitServices } from "@kit/services/services";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { PageHeader } from "@kit/ui/page-header";
import { AuditList } from "@/components/audit-list";
import { ACCOUNT_TARGET_TYPE } from "@/lib/adjustments/policy";
import { getAdjustments } from "@/lib/adjustments/runtime";

export default async function AuditPage() {
  await requireRole("Ledger.Approver");
  const [{ service }, kit] = await Promise.all([getAdjustments(), getKitServices()]);
  const requestIds = new Set((await service.listRequests()).map((r) => r.id));
  const entries = (await kit.auditLog.list()).filter(
    (e) => e.target.type === ACCOUNT_TARGET_TYPE || (e.target.type === APPROVAL_TARGET_TYPE && requestIds.has(e.target.id)),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Audit" description="Every adjustment request, decision and balance change, from the kit audit_log." />
      <Card className="gap-0 overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle>Activity</CardTitle>
          <CardDescription>{kit.sql ? "Stored in kit_audit_log, committed with each change." : "In memory (demo mode)."}</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <AuditList entries={entries} />
        </CardContent>
      </Card>
    </div>
  );
}
