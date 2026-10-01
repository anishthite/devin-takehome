import Link from "next/link";
import { Workflow } from "lucide-react";
import { requireRole } from "@kit/services/authz";
import { getKitServices } from "@kit/services/services";
import { PAYMENT_KIND, type ApprovalStatus } from "@kit/services/approvals";
import type { FlowApprovalView } from "@kit/dataverse/flow-approvals";
import { hasRole } from "@kit/auth/roles";
import { Alert, AlertDescription } from "@kit/ui/alert";
import { Amount } from "@kit/ui/amount";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { PageHeader } from "@kit/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@kit/ui/table";
import { cancelApproval, decideApproval, submitApproval } from "./actions";

const time = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
const formatTime = (iso: string) => `${time.format(new Date(iso))} UTC`;

const STATUS_VARIANTS: Record<ApprovalStatus, "warning" | "success" | "danger" | "secondary"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "secondary",
};

export default async function ApprovalsPage({ searchParams }: PageProps<"/approvals">) {
  const actor = await requireRole("Ledger.Viewer");
  const { error } = await searchParams;
  const services = await getKitServices();
  const requests = await services.approvals.list({ kind: PAYMENT_KIND });
  const canSubmit = hasRole(actor.roles, "Ledger.Operator");
  const canDecide = hasRole(actor.roles, "Ledger.Approver");

  let flowApprovals: FlowApprovalView[] | null = null;
  let flowError: string | null = null;
  if (services.flowApprovals) {
    try {
      flowApprovals = await services.flowApprovals.list();
    } catch (e) {
      flowError = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Approvals"
        description={
          <>
            Maker-checker: operators submit, a different approver decides.
            {services.dataverse !== "off" && " Status is mirrored to Dataverse; this list is the source of truth."}
          </>
        }
      />

      {typeof error === "string" && (
        <Alert variant="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {canSubmit && (
        <Card>
          <CardHeader>
            <CardTitle>Request approval</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={submitApproval} className="grid gap-3 sm:grid-cols-4">
              <Input name="title" required placeholder="What is this payment for?" aria-label="Title" />
              <Input name="counterparty" required placeholder="Counterparty" aria-label="Counterparty" />
              <Input name="amount" required inputMode="decimal" placeholder="Amount (USD)" aria-label="Amount" />
              <Button type="submit">Submit for approval</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="gap-0 overflow-hidden pb-0">
        <CardHeader className="pb-4">
          <CardTitle>Ledger approval requests</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader className="bg-muted/50 [&_tr]:border-t">
            <TableRow className="text-xs tracking-wide uppercase hover:bg-transparent">
              <TableHead className="px-5 text-muted-foreground">Request</TableHead>
              <TableHead className="px-5 text-muted-foreground">Requested by</TableHead>
              <TableHead className="px-5 text-muted-foreground">Status</TableHead>
              <TableHead className="px-5 text-right text-muted-foreground">Amount</TableHead>
              <TableHead className="px-5 text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="px-5 py-6 text-center text-muted-foreground">
                  No approval requests yet.
                </TableCell>
              </TableRow>
            )}
            {requests.map((r) => {
              const pending = r.status === "pending";
              const own = r.requestedById === actor.id;
              return (
                <TableRow key={r.id} className="align-top">
                  <TableCell className="px-5 py-3 whitespace-normal">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.counterparty}</p>
                    {r.mirror && <p className="mt-1 text-[11px] text-info">Mirrored to {r.mirror.entitySet}</p>}
                    {r.mirrorError && <p className="mt-1 text-[11px] text-loss">Mirror failed: {r.mirrorError}</p>}
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <p>{r.requestedByName}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(r.requestedAt)}</p>
                  </TableCell>
                  <TableCell className="px-5 py-3 whitespace-normal">
                    <Badge variant={STATUS_VARIANTS[r.status]} className="gap-1.5 capitalize">
                      <span aria-hidden className="size-1.5 rounded-full bg-current" />
                      {r.status}
                    </Badge>
                    {r.decidedByName && <p className="mt-1 text-xs text-muted-foreground">by {r.decidedByName}</p>}
                    {r.comment && <p className="mt-1 text-xs text-muted-foreground italic">“{r.comment}”</p>}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-right">
                    <Amount value={r.amountMinor} currency={r.currency} minor size="sm" />
                  </TableCell>
                  <TableCell className="space-y-2 px-5 py-3">
                    {pending && canDecide && !own && (
                      <form action={decideApproval} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <Input name="comment" placeholder="Comment" className="h-8 w-36 text-xs" aria-label="Comment" />
                        <Button name="decision" value="approved" variant="brand" size="sm">
                          Approve
                        </Button>
                        <Button name="decision" value="rejected" variant="outline" size="sm">
                          Reject
                        </Button>
                      </form>
                    )}
                    {pending && own && (
                      <form action={cancelApproval}>
                        <input type="hidden" name="id" value={r.id} />
                        <Button variant="secondary" size="sm">
                          Cancel
                        </Button>
                      </form>
                    )}
                    {canDecide && (
                      <Button asChild variant="link" size="xs" className="px-0">
                        <Link href={`/audit?request=${r.id}`}>Audit trail</Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {services.flowApprovals && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="size-5 text-info" />
              Power Automate approvals
            </CardTitle>
            <CardDescription>Read-only, from msdyn_flow_approval. Respond to these in Power Automate.</CardDescription>
          </CardHeader>
          <CardContent>
            {flowError && <p className="text-sm text-loss">Couldn&apos;t load Power Automate approvals: {flowError}</p>}
            {flowApprovals?.length === 0 && <p className="text-sm text-muted-foreground">No Power Automate approvals.</p>}
            <ul className="divide-y">
              {flowApprovals?.map((a) => (
                <li key={a.id} className="py-3 text-sm first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{a.title}</p>
                    <Badge variant="outline">
                      {a.stage}
                      {a.result && ` · ${a.result}`}
                    </Badge>
                  </div>
                  {a.details && <p className="text-xs text-muted-foreground">{a.details}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.owner ? `Requested by ${a.owner} · ` : ""}
                    {formatTime(a.createdOn)}
                  </p>
                  {a.responses.map((r) => (
                    <p key={r.id} className="mt-1 text-xs text-secondary-foreground">
                      {r.responder ?? "Someone"} responded <strong>{r.response}</strong>
                      {r.comments && ` — “${r.comments}”`}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
