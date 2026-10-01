import Link from "next/link";
import { ShieldAlert, TriangleAlert } from "lucide-react";
import { hasRole } from "@kit/auth/roles";
import { requireRole } from "@kit/services/authz";
import { Amount } from "@kit/ui/amount";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { PageHeader } from "@kit/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@kit/ui/table";
import { RequestStatusBadge } from "@/components/badges";
import { Notices } from "@/components/notices";
import { canApprove, reasonLabel, requiredApproverRole } from "@/lib/adjustments/policy";
import { getAdjustments } from "@/lib/adjustments/runtime";
import type { CustomerAccount } from "@/lib/adjustments/types";
import { formatTime } from "@/lib/format";
import { cancelAdjustment, decideAdjustment } from "../actions";

const HEAD = "text-xs tracking-wide uppercase hover:bg-transparent";

export default async function ApprovalsPage({ searchParams }: PageProps<"/approvals">) {
  const actor = await requireRole("Ledger.Viewer");
  const { error, notice } = await searchParams;
  const { service } = await getAdjustments();
  const requests = await service.listRequests();
  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");

  const accounts = new Map<string, CustomerAccount | null>();
  await Promise.all(
    [...new Set(pending.map((r) => r.accountId))].map(async (id) => accounts.set(id, await service.accounts.get(id))),
  );
  const isApprover = hasRole(actor.roles, "Ledger.Approver");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Approvals"
        description="Maker-checker: an operator requests, a different approver posts. Approving re-checks the live balance and posts in one transaction."
      />
      <Notices error={error} notice={notice} />

      <Card className="gap-0 overflow-hidden pb-0">
        <CardHeader className="pb-4">
          <CardTitle>Pending</CardTitle>
          <CardDescription>{pending.length} awaiting review</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader className="bg-muted/50 [&_tr]:border-t">
            <TableRow className={HEAD}>
              <TableHead className="px-5 text-muted-foreground">Customer</TableHead>
              <TableHead className="px-5 text-muted-foreground">Adjustment</TableHead>
              <TableHead className="px-5 text-muted-foreground">Requested by</TableHead>
              <TableHead className="px-5 text-right text-muted-foreground">Amount</TableHead>
              <TableHead className="px-5 text-right text-muted-foreground">Balance now → after</TableHead>
              <TableHead className="px-5 text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="px-5 py-6 text-center text-muted-foreground">
                  Nothing to review.
                </TableCell>
              </TableRow>
            )}
            {pending.map((r) => {
              const account = accounts.get(r.accountId);
              const balance = account?.balanceMinor ?? 0;
              const after = balance + r.signedAmountMinor;
              const own = r.requestedById === actor.id;
              const needsAdmin = requiredApproverRole(r.amountMinor) === "Ledger.Admin";
              const allowed = isApprover && !own && canApprove(actor.roles, r.amountMinor);
              return (
                <TableRow key={r.id} className="align-top">
                  <TableCell className="px-5 py-3">
                    <Link href={`/customers/${r.accountId}`} className="font-medium hover:underline">
                      {r.customerName}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">{r.accountNumber}</p>
                  </TableCell>
                  <TableCell className="max-w-xs px-5 py-3 whitespace-normal">
                    <p className="font-medium">{reasonLabel(r.reasonCode)}</p>
                    <p className="text-xs text-muted-foreground">{r.memo}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {needsAdmin && (
                        <Badge variant="info" className="gap-1">
                          <ShieldAlert className="size-3" />
                          Admin approval
                        </Badge>
                      )}
                      {after < 0 && (
                        <Badge variant="danger" className="gap-1">
                          <TriangleAlert className="size-3" />
                          Would overdraw
                        </Badge>
                      )}
                      {account && account.status !== "active" && <Badge variant="danger">Account {account.status}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <p>{r.requestedByName}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(r.requestedAt)}</p>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-right">
                    <Amount value={r.signedAmountMinor} minor signed size="sm" />
                  </TableCell>
                  <TableCell className="px-5 py-3 text-right text-xs">
                    <Amount value={balance} minor size="sm" /> → <Amount value={after} minor size="sm" />
                  </TableCell>
                  <TableCell className="space-y-2 px-5 py-3">
                    {allowed && (
                      <form action={decideAdjustment} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="returnTo" value="/approvals" />
                        <Input name="comment" placeholder="Comment" className="h-8 w-36 text-xs" aria-label="Comment" maxLength={500} />
                        <Button name="decision" value="approved" variant="brand" size="sm">
                          Approve &amp; post
                        </Button>
                        <Button name="decision" value="rejected" variant="outline" size="sm">
                          Reject
                        </Button>
                      </form>
                    )}
                    {isApprover && !own && !allowed && (
                      <p className="text-xs text-muted-foreground">Needs an Admin to approve</p>
                    )}
                    {own && (
                      <form action={cancelAdjustment} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="returnTo" value="/approvals" />
                        <Button variant="secondary" size="sm">
                          Cancel
                        </Button>
                        <span className="text-xs text-muted-foreground">You requested this</span>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card className="gap-0 overflow-hidden pb-0">
        <CardHeader className="pb-4">
          <CardTitle>History</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader className="bg-muted/50 [&_tr]:border-t">
            <TableRow className={HEAD}>
              <TableHead className="px-5 text-muted-foreground">Customer</TableHead>
              <TableHead className="px-5 text-muted-foreground">Adjustment</TableHead>
              <TableHead className="px-5 text-muted-foreground">Maker → checker</TableHead>
              <TableHead className="px-5 text-muted-foreground">Status</TableHead>
              <TableHead className="px-5 text-right text-muted-foreground">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {decided.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="px-5 py-6 text-center text-muted-foreground">
                  No decisions yet.
                </TableCell>
              </TableRow>
            )}
            {decided.map((r) => (
              <TableRow key={r.id} className="align-top">
                <TableCell className="px-5 py-3">
                  <Link href={`/customers/${r.accountId}`} className="font-medium hover:underline">
                    {r.customerName}
                  </Link>
                </TableCell>
                <TableCell className="max-w-xs px-5 py-3 whitespace-normal">
                  <p>{reasonLabel(r.reasonCode)}</p>
                  {r.comment && <p className="text-xs text-muted-foreground italic">“{r.comment}”</p>}
                </TableCell>
                <TableCell className="px-5 py-3 text-xs">
                  {r.requestedByName} → {r.decidedByName ?? "—"}
                  {r.decidedAt && <p className="text-muted-foreground">{formatTime(r.decidedAt)}</p>}
                </TableCell>
                <TableCell className="px-5 py-3">
                  <RequestStatusBadge status={r.status} />
                </TableCell>
                <TableCell className="px-5 py-3 text-right">
                  <Amount value={r.signedAmountMinor} minor signed size="sm" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
