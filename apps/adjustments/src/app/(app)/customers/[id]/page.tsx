import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { hasRole } from "@kit/auth/roles";
import { requireRole } from "@kit/services/authz";
import { getKitServices } from "@kit/services/services";
import { Amount } from "@kit/ui/amount";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { DescriptionItem, DescriptionList } from "@kit/ui/description-list";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { PageHeader } from "@kit/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@kit/ui/table";
import { Textarea } from "@kit/ui/textarea";
import { AccountStatusBadge, RequestStatusBadge } from "@/components/badges";
import { AuditList } from "@/components/audit-list";
import { NativeSelect } from "@/components/native-select";
import { Notices } from "@/components/notices";
import {
  ACCOUNT_TARGET_TYPE,
  ADMIN_APPROVAL_THRESHOLD_MINOR,
  MEMO_MAX,
  MEMO_MIN,
  REASONS,
  reasonLabel,
} from "@/lib/adjustments/policy";
import { getAdjustments } from "@/lib/adjustments/runtime";
import { formatTime } from "@/lib/format";
import { submitAdjustment } from "../../actions";

export default async function CustomerPage({ params, searchParams }: PageProps<"/customers/[id]">) {
  const actor = await requireRole("Ledger.Viewer");
  const [{ id }, { error, notice }] = await Promise.all([params, searchParams]);
  const { service } = await getAdjustments();
  const account = await service.accounts.get(id);
  if (!account) notFound();

  const canAudit = hasRole(actor.roles, "Ledger.Approver");
  const [requests, posted, audit] = await Promise.all([
    service.listRequests({ accountId: id }),
    service.accounts.adjustments(id),
    canAudit ? getKitServices().then((k) => k.auditLog.list({ type: ACCOUNT_TARGET_TYPE, id })) : Promise.resolve([]),
  ]);
  const pendingNet = requests.filter((r) => r.status === "pending").reduce((s, r) => s + r.signedAmountMinor, 0);
  const canSubmit = hasRole(actor.roles, "Ledger.Operator") && account.status === "active";
  const returnTo = `/customers/${id}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button asChild variant="link" size="xs" className="px-0">
        <Link href="/">
          <ArrowLeft />
          All customers
        </Link>
      </Button>
      <PageHeader title={account.name} description={account.email} actions={<AccountStatusBadge status={account.status} />} />
      <Notices error={error} notice={notice} />

      <Card>
        <CardContent>
          <DescriptionList className="grid gap-4 sm:grid-cols-4">
            <DescriptionItem term="Balance">
              <Amount value={account.balanceMinor} minor size="lg" />
            </DescriptionItem>
            <DescriptionItem term="Pending net change">
              <Amount value={pendingNet} minor signed size="lg" />
            </DescriptionItem>
            <DescriptionItem term="Account number" mono>
              {account.accountNumber}
            </DescriptionItem>
            <DescriptionItem term="Last updated">{formatTime(account.updatedAt)}</DescriptionItem>
          </DescriptionList>
        </CardContent>
      </Card>

      {canSubmit && (
        <Card>
          <CardHeader>
            <CardTitle>Request adjustment</CardTitle>
            <CardDescription>
              Goes to the approval queue; a different user must approve it before the balance changes. Over{" "}
              <Amount value={ADMIN_APPROVAL_THRESHOLD_MINOR} minor size="sm" hideCents /> needs an Admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={submitAdjustment} className="grid gap-4 sm:grid-cols-3">
              <input type="hidden" name="accountId" value={account.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <div className="space-y-1.5">
                <Label htmlFor="direction">Type</Label>
                <NativeSelect id="direction" name="direction" required defaultValue="credit">
                  <option value="credit">Credit (increase balance)</option>
                  <option value="debit">Debit (decrease balance)</option>
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input id="amount" name="amount" required inputMode="decimal" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reasonCode">Reason</Label>
                <NativeSelect id="reasonCode" name="reasonCode" required defaultValue="">
                  <option value="" disabled>
                    Choose a reason
                  </option>
                  {Object.entries(REASONS).map(([code, r]) => (
                    <option key={code} value={code}>
                      {r.label} ({r.directions.join("/")})
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <Label htmlFor="memo">Memo</Label>
                <Textarea
                  id="memo"
                  name="memo"
                  required
                  minLength={MEMO_MIN}
                  maxLength={MEMO_MAX}
                  placeholder="Why is this adjustment needed? Reference the ticket, dispute or statement."
                />
              </div>
              <div className="sm:col-span-3">
                <Button type="submit">Submit for approval</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="gap-0 overflow-hidden pb-0">
        <CardHeader className="pb-4">
          <CardTitle>Adjustment requests</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader className="bg-muted/50 [&_tr]:border-t">
            <TableRow className="text-xs tracking-wide uppercase hover:bg-transparent">
              <TableHead className="px-5 text-muted-foreground">Reason</TableHead>
              <TableHead className="px-5 text-muted-foreground">Requested</TableHead>
              <TableHead className="px-5 text-muted-foreground">Status</TableHead>
              <TableHead className="px-5 text-right text-muted-foreground">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="px-5 py-6 text-center text-muted-foreground">
                  No adjustment requests.
                </TableCell>
              </TableRow>
            )}
            {requests.map((r) => (
              <TableRow key={r.id} className="align-top">
                <TableCell className="max-w-md px-5 py-3 whitespace-normal">
                  <p className="font-medium">{reasonLabel(r.reasonCode)}</p>
                  <p className="text-xs text-muted-foreground">{r.memo}</p>
                </TableCell>
                <TableCell className="px-5 py-3">
                  <p>{r.requestedByName}</p>
                  <p className="text-xs text-muted-foreground">{formatTime(r.requestedAt)}</p>
                </TableCell>
                <TableCell className="px-5 py-3 whitespace-normal">
                  <RequestStatusBadge status={r.status} />
                  {r.decidedByName && <p className="mt-1 text-xs text-muted-foreground">by {r.decidedByName}</p>}
                </TableCell>
                <TableCell className="px-5 py-3 text-right">
                  <Amount value={r.signedAmountMinor} minor signed size="sm" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="gap-0 overflow-hidden pb-0">
        <CardHeader className="pb-4">
          <CardTitle>Posted adjustments</CardTitle>
          <CardDescription>Journal rows written to balance_adjustments in the customer database.</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader className="bg-muted/50 [&_tr]:border-t">
            <TableRow className="text-xs tracking-wide uppercase hover:bg-transparent">
              <TableHead className="px-5 text-muted-foreground">Posted</TableHead>
              <TableHead className="px-5 text-muted-foreground">Reason</TableHead>
              <TableHead className="px-5 text-muted-foreground">Maker → checker</TableHead>
              <TableHead className="px-5 text-right text-muted-foreground">Amount</TableHead>
              <TableHead className="px-5 text-right text-muted-foreground">Balance after</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posted.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="px-5 py-6 text-center text-muted-foreground">
                  Nothing posted yet.
                </TableCell>
              </TableRow>
            )}
            {posted.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="px-5 py-3 text-xs">{formatTime(p.postedAt)}</TableCell>
                <TableCell className="px-5 py-3">{reasonLabel(p.reasonCode)}</TableCell>
                <TableCell className="px-5 py-3 text-xs">
                  {p.requestedByName} → {p.approvedByName}
                </TableCell>
                <TableCell className="px-5 py-3 text-right">
                  <Amount value={p.amountMinor} minor signed size="sm" />
                </TableCell>
                <TableCell className="px-5 py-3 text-right">
                  <Amount value={p.balanceAfterMinor} minor size="sm" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {canAudit && (
        <Card className="gap-0 overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle>Account audit trail</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <AuditList entries={audit} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
