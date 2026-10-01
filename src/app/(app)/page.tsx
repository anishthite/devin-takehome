import { ArrowDownLeft, ArrowUpRight, Clock, ShieldCheck, Wallet } from "lucide-react";
import { auth } from "@/auth";
import { currentActor } from "@/lib/kit/authz";
import { getKitServices } from "@/lib/kit/services";
import { formatCompactMoney, formatDate, formatMoney } from "@/lib/ledger/format";
import { MOCK_OPENING_BALANCE_MINOR, mockLedger } from "@/demo/ledger";
import { summarize } from "@/lib/ledger/summary";
import { ROLE_LABELS } from "@/lib/roles";
import { Amount } from "@/ui-components/amount";
import { Badge } from "@/ui-components/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/ui-components/card";
import { DescriptionItem, DescriptionList } from "@/ui-components/description-list";
import { FlowChart, FlowLegend } from "@/ui-components/flow-chart";
import { PageHeader } from "@/ui-components/page-header";
import { StatCard } from "@/ui-components/stat-card";
import { StatusBadge } from "@/ui-components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui-components/table";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;
  const actor = await currentActor();
  const { dataverse } = await getKitServices();
  const now = new Date();
  const entries = mockLedger(now);
  const summary = summarize(entries, MOCK_OPENING_BALANCE_MINOR, now, 14);
  const firstName = user?.name?.split(" ")[0];
  const flow = summary.daily.map((d) => ({
    label: formatDate(d.date),
    inflow: d.inflowMinor,
    outflow: d.outflowMinor,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        description="Here's what moved through the ledger in the last 14 days."
        actions={<Badge variant="warning">Sample data</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Balance"
          value={<Amount value={summary.balanceMinor} minor size="xl" className="text-2xl" />}
          hint="Posted entries only"
          icon={<Wallet />}
          tone="ink"
        />
        <StatCard
          label="Inflow · 14d"
          value={<Amount value={summary.inflowMinor} minor size="xl" className="text-2xl" />}
          hint="Incoming payments"
          icon={<ArrowDownLeft />}
          tone="gain"
        />
        <StatCard
          label="Outflow · 14d"
          value={<Amount value={summary.outflowMinor} minor size="xl" className="text-2xl" />}
          hint="Outgoing payments"
          icon={<ArrowUpRight />}
          tone="neutral"
        />
        <StatCard
          label="Pending"
          value={summary.pendingCount}
          hint={`${formatMoney(summary.pendingMinor, "USD", { signed: true })} net awaiting settlement`}
          icon={<Clock />}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cash flow</CardTitle>
            <CardAction>
              <FlowLegend />
            </CardAction>
          </CardHeader>
          <CardContent>
            <FlowChart data={flow} minor />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-brand" />
              Your access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DescriptionList>
              <DescriptionItem term="Signed in as">{user?.email ?? user?.name}</DescriptionItem>
              <DescriptionItem term={dataverse === "off" ? "Entra app roles" : "Dataverse security roles"}>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  {actor.roles.map((role) => (
                    <Badge key={role} variant="secondary" className="rounded-md">
                      {ROLE_LABELS[role]}
                    </Badge>
                  ))}
                </span>
              </DescriptionItem>
              <DescriptionItem term="Tenant" mono>
                {user?.tenantId}
              </DescriptionItem>
              <DescriptionItem term="Object ID" mono>
                {user?.id}
              </DescriptionItem>
            </DescriptionList>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 overflow-hidden pb-0">
        <CardHeader className="pb-4">
          <CardTitle>Recent payments</CardTitle>
          <CardAction className="text-xs text-muted-foreground">
            Total 30d volume{" "}
            {formatCompactMoney(entries.reduce((sum, e) => sum + Math.abs(e.amountMinor), 0))}
          </CardAction>
        </CardHeader>
        <Table>
          <TableHeader className="bg-muted/50 [&_tr]:border-t">
            <TableRow className="text-xs tracking-wide uppercase hover:bg-transparent">
              <TableHead className="px-5 text-muted-foreground">Counterparty</TableHead>
              <TableHead className="px-5 text-muted-foreground">Method</TableHead>
              <TableHead className="px-5 text-muted-foreground">Date</TableHead>
              <TableHead className="px-5 text-muted-foreground">Status</TableHead>
              <TableHead className="px-5 text-right text-muted-foreground">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.slice(0, 8).map((e) => (
              <TableRow key={e.id}>
                <TableCell className="px-5 py-3">
                  <p className="font-medium">{e.counterparty}</p>
                  <p className="text-xs text-muted-foreground">{e.description}</p>
                </TableCell>
                <TableCell className="px-5 py-3">
                  <Badge variant="outline" className="rounded-md font-mono text-[11px]">
                    {e.method}
                  </Badge>
                </TableCell>
                <TableCell className="px-5 py-3 text-muted-foreground">{formatDate(e.occurredAt)}</TableCell>
                <TableCell className="px-5 py-3">
                  <StatusBadge status={e.status} />
                </TableCell>
                <TableCell className="px-5 py-3 text-right">
                  <Amount
                    value={e.amountMinor}
                    currency={e.currency}
                    minor
                    signed
                    size="sm"
                    tone={e.amountMinor > 0 ? "auto" : "neutral"}
                    className={e.status === "failed" ? "text-muted-foreground line-through" : undefined}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
