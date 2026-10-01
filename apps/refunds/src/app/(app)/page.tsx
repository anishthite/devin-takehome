import Link from "next/link";
import { BadgeCheck, CheckCircle2, Clock, Gauge, ReceiptText, ShieldCheck } from "lucide-react";
import { ROLE_LABELS, hasRole } from "@kit/auth/roles";
import { currentActor } from "@kit/services/authz";
import { getKitServices } from "@kit/services/services";
import { Amount } from "@kit/ui/amount";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { PageHeader } from "@kit/ui/page-header";
import { Progress } from "@kit/ui/progress";
import { StatCard } from "@kit/ui/stat-card";
import { Table, TableBody, TableCell, TableRow } from "@kit/ui/table";
import { RefundStatusBadge } from "@/components/refund-status-badge";
import { RefundTable } from "@/components/refund-table";
import { RefundsChart, RefundsChartLegend } from "@/components/refunds-chart";
import { formatCompactMoney, formatDate, formatHours, formatMoney } from "@/lib/refunds/format";
import { permissionsFor } from "@/lib/refunds/permissions";
import { getRefunds } from "@/lib/refunds/server";
import { canApprove, canDecide } from "@/lib/refunds/service";
import { summarize } from "@/lib/refunds/summary";
import { REASON_LABELS } from "@/lib/refunds/types";

export default async function DashboardPage() {
  const actor = await currentActor();
  const { dataverse } = await getKitServices();
  const refunds = await (await getRefunds()).list();
  const now = new Date();
  const summary = summarize(refunds, now, 30);
  const firstName = actor.name.split(" ")[0];
  const chart = summary.daily.slice(-14).map((d) => ({
    label: formatDate(`${d.date}T00:00:00Z`),
    requested: d.requestedMinor,
    issued: d.issuedMinor,
  }));
  const reasonTotal = summary.byReason.reduce((sum, r) => sum + r.amountMinor, 0);

  const toDecide = refunds.filter((r) => r.status === "pending_approval" && canDecide(actor, r));
  const toIssue = hasRole(actor.roles, "Ledger.Operator") ? refunds.filter((r) => r.status === "approved") : [];
  const attention = [
    ...toDecide.map((r) => ({ refund: r, action: canApprove(actor, r) ? "Approve" : "Review" })),
    ...toIssue.map((r) => ({ refund: r, action: "Issue" })),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Refund activity across all channels over the last 30 days."
        actions={
          <>
            <Badge variant="warning">Includes sample history</Badge>
            {hasRole(actor.roles, "Ledger.Operator") && (
              <Button asChild size="sm">
                <Link href="/refunds/new">New refund</Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Issued · 30d"
          value={<Amount value={summary.issuedMinor} minor size="xl" className="text-2xl" />}
          hint={`${summary.issuedCount} refunds paid out`}
          icon={<ReceiptText />}
          tone="info"
        />
        <StatCard
          label="Awaiting approval"
          value={summary.pendingCount}
          hint={`${formatMoney(summary.pendingMinor)} requested`}
          icon={<Clock />}
          tone="warning"
        />
        <StatCard
          label="Approved, not issued"
          value={summary.awaitingIssueCount}
          hint={`${formatMoney(summary.awaitingIssueMinor)} ready to pay out`}
          icon={<BadgeCheck />}
          tone="neutral"
        />
        <StatCard
          label="Approval rate · 30d"
          value={summary.approvalRate === null ? "—" : `${Math.round(summary.approvalRate * 100)}%`}
          hint={
            summary.avgHoursToDecision === null ? "No decisions yet" : `${formatHours(summary.avgHoursToDecision)} avg time to decision`
          }
          icon={<Gauge />}
          tone="ink"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Refund volume · 14d</CardTitle>
            <CardAction>
              <RefundsChartLegend />
            </CardAction>
          </CardHeader>
          <CardContent>
            <RefundsChart data={chart} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-brand" />
              Your access
            </CardTitle>
            <CardDescription>
              {dataverse === "off" ? "From your Entra app roles" : "From your Dataverse security roles"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <span className="flex flex-wrap gap-1.5">
              {actor.roles.map((role) => (
                <Badge key={role} variant="secondary" className="rounded-md">
                  {ROLE_LABELS[role]}
                </Badge>
              ))}
            </span>
            <ul className="space-y-1.5 text-sm">
              {permissionsFor(actor.roles).map((p) => (
                <li key={p.label} className={p.allowed ? "flex gap-2" : "flex gap-2 text-muted-foreground line-through"}>
                  <CheckCircle2 className={p.allowed ? "mt-0.5 size-4 shrink-0 text-gain" : "mt-0.5 size-4 shrink-0 opacity-40"} />
                  {p.label}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Top reasons · 30d</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.byReason.map((r) => (
              <div key={r.reason} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {REASON_LABELS[r.reason]} <span className="text-xs text-muted-foreground">· {r.count}</span>
                  </span>
                  <span className="tabular text-muted-foreground">{formatCompactMoney(r.amountMinor)}</span>
                </div>
                <Progress value={reasonTotal ? (r.amountMinor / reasonTotal) * 100 : 0} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden pb-0 lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle>Needs your attention</CardTitle>
            <CardDescription>
              {attention.length === 0 ? "Nothing waiting on you." : `${attention.length} refunds waiting on you`}
            </CardDescription>
          </CardHeader>
          {attention.length > 0 && (
            <Table>
              <TableBody>
                {attention.slice(0, 5).map(({ refund: r, action }) => (
                  <TableRow key={r.id}>
                    <TableCell className="px-5 py-3">
                      <p className="font-medium">{r.customerName}</p>
                      <p className="font-mono text-xs text-muted-foreground">{r.orderId}</p>
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      <RefundStatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="px-5 py-3 text-right">
                      <Amount value={r.amountMinor} minor size="sm" />
                    </TableCell>
                    <TableCell className="px-5 py-3 text-right">
                      <Button asChild size="xs" variant={action === "Approve" ? "brand" : "outline"}>
                        <Link href={`/refunds/${r.id}`}>{action}</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <Card className="gap-0 overflow-hidden pb-0">
        <CardHeader className="pb-4">
          <CardTitle>Recent refunds</CardTitle>
          <CardAction>
            <Button asChild variant="link" size="sm" className="px-0">
              <Link href="/refunds">View all</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <RefundTable refunds={refunds.slice(0, 8)} />
      </Card>
    </div>
  );
}
