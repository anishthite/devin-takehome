import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, ShieldAlert } from "lucide-react";
import { hasRole } from "@kit/auth/roles";
import { mergeAuditTrail, type AuditViewerEntry } from "@kit/services/audit-reader";
import { requireRole } from "@kit/services/authz";
import { getKitServices } from "@kit/services/services";
import { Alert, AlertDescription } from "@kit/ui/alert";
import { Amount } from "@kit/ui/amount";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { DescriptionItem, DescriptionList } from "@kit/ui/description-list";
import { PageHeader } from "@kit/ui/page-header";
import { Textarea } from "@kit/ui/textarea";
import { AuditTimeline } from "@/components/audit-timeline";
import { RefundStatusBadge } from "@/components/refund-status-badge";
import { formatDateTime, formatMoney } from "@/lib/refunds/format";
import { getRefunds } from "@/lib/refunds/server";
import { ADMIN_APPROVAL_THRESHOLD_MINOR, canApprove, needsAdminApproval } from "@/lib/refunds/service";
import { REASON_LABELS } from "@/lib/refunds/types";
import { cancelRefund, decideRefund, issueRefund } from "../actions";

export default async function RefundPage({ params, searchParams }: PageProps<"/refunds/[id]">) {
  const actor = await requireRole("Ledger.Viewer");
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const service = await getRefunds();
  const refund = await service.get(id);
  if (!refund) notFound();

  const kit = await getKitServices();
  const approval = refund.approvalId ? await kit.approvals.get(refund.approvalId) : null;
  let dataverse: AuditViewerEntry[] = [];
  let dataverseError: string | null = null;
  if (kit.auditReader && approval?.mirror) {
    try {
      dataverse = await kit.auditReader.recordChangeHistory(approval.mirror);
    } catch (e) {
      dataverseError = e instanceof Error ? e.message : String(e);
    }
  }
  const canSeeAudit = hasRole(actor.roles, "Ledger.Approver");
  const entries = canSeeAudit ? mergeAuditTrail(await service.auditTrail(refund), dataverse) : [];

  const pending = refund.status === "pending_approval";
  const ownRequest = refund.requestedById === actor.id;
  const mayDecide = pending && canApprove(actor, refund);
  const mayCancel = pending && ownRequest && !refund.sample;
  const mayIssue = refund.status === "approved" && hasRole(actor.roles, "Ledger.Operator");
  const adminOnly = needsAdminApproval(refund);

  let lockedReason: string | null = null;
  if (pending && !mayDecide) {
    if (ownRequest) lockedReason = "You requested this refund, so someone else has to approve it.";
    else if (adminOnly && hasRole(actor.roles, "Ledger.Approver"))
      lockedReason = `Refunds over ${formatMoney(ADMIN_APPROVAL_THRESHOLD_MINOR)} need an Admin to approve.`;
    else lockedReason = "Waiting on an approver.";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button asChild variant="link" size="sm" className="px-0 text-muted-foreground">
        <Link href="/refunds">
          <ArrowLeft />
          All refunds
        </Link>
      </Button>
      <PageHeader
        title={`Refund for ${refund.customerName}`}
        description={
          <span className="font-mono text-xs">
            {refund.orderId} · {refund.id}
          </span>
        }
        actions={
          <>
            {refund.sample && <Badge variant="secondary">Sample history</Badge>}
            {adminOnly && <Badge variant="warning">Admin approval</Badge>}
            <RefundStatusBadge status={refund.status} />
          </>
        }
      />

      {typeof error === "string" && (
        <Alert variant="danger">
          <ShieldAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardDescription>Refund amount</CardDescription>
            <CardTitle>
              <Amount value={refund.amountMinor} minor size="xl" className="text-3xl" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DescriptionList className="grid gap-4 space-y-0 sm:grid-cols-2">
              <DescriptionItem term="Customer">{refund.customerName}</DescriptionItem>
              <DescriptionItem term="Email">{refund.customerEmail}</DescriptionItem>
              <DescriptionItem term="Reason">{REASON_LABELS[refund.reason]}</DescriptionItem>
              <DescriptionItem term="Original payment method">{refund.paymentMethod}</DescriptionItem>
              <DescriptionItem term="Requested">
                {refund.requestedByName} · {formatDateTime(refund.requestedAt)}
              </DescriptionItem>
              <DescriptionItem term="Decision">
                {refund.decidedByName ? `${refund.decidedByName} · ${formatDateTime(refund.decidedAt!)}` : "—"}
              </DescriptionItem>
              <DescriptionItem term="Issued">
                {refund.issuedByName ? `${refund.issuedByName} · ${formatDateTime(refund.issuedAt!)}` : "—"}
              </DescriptionItem>
              <DescriptionItem term="Processor reference" mono>
                {refund.providerRef ?? "—"}
              </DescriptionItem>
              {refund.note && (
                <DescriptionItem term="Note" className="sm:col-span-2 [&_dd]:whitespace-normal">
                  {refund.note}
                </DescriptionItem>
              )}
              {refund.decisionComment && (
                <DescriptionItem term="Approver comment" className="sm:col-span-2 [&_dd]:whitespace-normal">
                  {refund.decisionComment}
                </DescriptionItem>
              )}
            </DescriptionList>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Maker-checker: the requester can&apos;t approve their own refund.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mayDecide && (
              <form action={decideRefund} className="space-y-3">
                <input type="hidden" name="id" value={refund.id} />
                <Textarea name="comment" placeholder="Comment (optional)" aria-label="Decision comment" />
                <div className="flex gap-2">
                  <Button type="submit" name="decision" value="approved" variant="brand" className="flex-1">
                    Approve
                  </Button>
                  <Button type="submit" name="decision" value="rejected" variant="outline" className="flex-1">
                    Reject
                  </Button>
                </div>
              </form>
            )}
            {mayIssue && (
              <form action={issueRefund}>
                <input type="hidden" name="id" value={refund.id} />
                <Button type="submit" className="w-full">
                  Issue {formatMoney(refund.amountMinor)} to {refund.paymentMethod}
                </Button>
              </form>
            )}
            {mayCancel && (
              <form action={cancelRefund}>
                <input type="hidden" name="id" value={refund.id} />
                <Button type="submit" variant="ghost" className="w-full">
                  Withdraw request
                </Button>
              </form>
            )}
            {lockedReason && (
              <p className="flex gap-2 text-sm text-muted-foreground">
                <Lock className="mt-0.5 size-4 shrink-0" />
                {lockedReason}
              </p>
            )}
            {!pending && !mayIssue && <p className="text-sm text-muted-foreground">No actions available.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 overflow-hidden pb-0">
        <CardHeader className="pb-4">
          <CardTitle>Audit trail</CardTitle>
          <CardDescription>
            {!canSeeAudit
              ? "Approvers and Admins can see this refund's audit trail."
              : refund.sample
                ? "Imported sample history has no kit audit entries."
                : approval?.mirror
                  ? "Kit audit_log merged with the Dataverse change history of the mirrored approval."
                  : "Kit audit_log entries for this refund and its approval request."}
          </CardDescription>
          {dataverseError && (
            <CardDescription className="text-loss">Couldn&apos;t load Dataverse history: {dataverseError}</CardDescription>
          )}
        </CardHeader>
        {canSeeAudit && <AuditTimeline entries={entries} />}
      </Card>
    </div>
  );
}
