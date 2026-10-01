import Link from "next/link";
import { Clock, Database, Search, Users, Wallet } from "lucide-react";
import { requireRole } from "@kit/services/authz";
import { Amount } from "@kit/ui/amount";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { Card, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { PageHeader } from "@kit/ui/page-header";
import { StatCard } from "@kit/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@kit/ui/table";
import { AccountStatusBadge } from "@/components/badges";
import { getAdjustments } from "@/lib/adjustments/runtime";

export default async function CustomersPage({ searchParams }: PageProps<"/">) {
  await requireRole("Ledger.Viewer");
  const { q } = await searchParams;
  const search = typeof q === "string" ? q.slice(0, 100) : "";
  const { service, database } = await getAdjustments();
  const [accounts, requests] = await Promise.all([service.accounts.list(search), service.listRequests()]);

  const pending = requests.filter((r) => r.status === "pending");
  const pendingByAccount = new Map<string, number>();
  for (const r of pending) pendingByAccount.set(r.accountId, (pendingByAccount.get(r.accountId) ?? 0) + 1);
  const total = accounts.reduce((sum, a) => sum + a.balanceMinor, 0);
  const pendingNet = pending.reduce((sum, r) => sum + r.signedAmountMinor, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Customer balances"
        description="Request a balance adjustment on a customer account. Nothing posts until a second person approves it."
        actions={
          <Badge variant={database === "mock" ? "warning" : "info"} className="gap-1.5">
            <Database className="size-3" />
            {database === "mock" ? "In-memory database" : "Postgres"}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Customer balances"
          value={<Amount value={total} minor size="xl" className="text-2xl" />}
          hint={`${accounts.length} accounts${search ? " matching" : ""}`}
          icon={<Wallet />}
          tone="ink"
        />
        <StatCard
          label="Pending adjustments"
          value={<span className="text-2xl font-semibold tabular-nums">{pending.length}</span>}
          hint="Awaiting a checker"
          icon={<Clock />}
          tone="warning"
        />
        <StatCard
          label="Pending net change"
          value={<Amount value={pendingNet} minor signed size="xl" className="text-2xl" />}
          hint="If everything pending is approved"
          icon={<Users />}
          tone="info"
        />
      </div>

      <Card className="gap-0 overflow-hidden pb-0">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <CardTitle>Accounts</CardTitle>
          <form className="flex w-full max-w-sm gap-2" role="search">
            <Input name="q" defaultValue={search} placeholder="Name, account number or email" aria-label="Search accounts" />
            <Button type="submit" variant="outline" size="icon" aria-label="Search">
              <Search />
            </Button>
          </form>
        </CardHeader>
        <Table>
          <TableHeader className="bg-muted/50 [&_tr]:border-t">
            <TableRow className="text-xs tracking-wide uppercase hover:bg-transparent">
              <TableHead className="px-5 text-muted-foreground">Customer</TableHead>
              <TableHead className="px-5 text-muted-foreground">Account</TableHead>
              <TableHead className="px-5 text-muted-foreground">Status</TableHead>
              <TableHead className="px-5 text-muted-foreground">Pending</TableHead>
              <TableHead className="px-5 text-right text-muted-foreground">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="px-5 py-6 text-center text-muted-foreground">
                  No accounts found.
                </TableCell>
              </TableRow>
            )}
            {accounts.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="px-5 py-3">
                  <Link href={`/customers/${a.id}`} className="font-medium hover:underline">
                    {a.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                </TableCell>
                <TableCell className="px-5 py-3 font-mono text-xs">{a.accountNumber}</TableCell>
                <TableCell className="px-5 py-3">
                  <AccountStatusBadge status={a.status} />
                </TableCell>
                <TableCell className="px-5 py-3">
                  {pendingByAccount.get(a.id) ? <Badge variant="warning">{pendingByAccount.get(a.id)} pending</Badge> : "—"}
                </TableCell>
                <TableCell className="px-5 py-3 text-right">
                  <Amount value={a.balanceMinor} minor size="sm" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
