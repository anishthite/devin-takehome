import Link from "next/link";
import { Search } from "lucide-react";
import { hasRole } from "@kit/auth/roles";
import { cn } from "@kit/lib/utils";
import { requireRole } from "@kit/services/authz";
import { Button } from "@kit/ui/button";
import { Card, CardHeader } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { PageHeader } from "@kit/ui/page-header";
import { RefundTable } from "@/components/refund-table";
import { getRefunds } from "@/lib/refunds/server";
import { REFUND_STATUSES, STATUS_LABELS, type RefundStatus } from "@/lib/refunds/types";

const isStatus = (value: unknown): value is RefundStatus =>
  typeof value === "string" && (REFUND_STATUSES as readonly string[]).includes(value);

export default async function RefundsPage({ searchParams }: PageProps<"/refunds">) {
  const actor = await requireRole("Ledger.Viewer");
  const params = await searchParams;
  const status = isStatus(params.status) ? params.status : null;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const all = await (await getRefunds()).list();

  const needle = q.toLowerCase();
  const matching = needle
    ? all.filter((r) =>
        [r.orderId, r.customerName, r.customerEmail, r.id].some((v) => v.toLowerCase().includes(needle)),
      )
    : all;
  const shown = status ? matching.filter((r) => r.status === status) : matching;

  const href = (s: RefundStatus | null) => {
    const sp = new URLSearchParams();
    if (s) sp.set("status", s);
    if (q) sp.set("q", q);
    const query = sp.toString();
    return query ? `/refunds?${query}` : "/refunds";
  };
  const tabs: Array<{ key: RefundStatus | null; label: string; count: number }> = [
    { key: null, label: "All", count: matching.length },
    ...REFUND_STATUSES.map((s) => ({ key: s, label: STATUS_LABELS[s], count: matching.filter((r) => r.status === s).length })),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Refunds"
        description="Every refund request, from submission through approval to payout."
        actions={
          hasRole(actor.roles, "Ledger.Operator") && (
            <Button asChild size="sm">
              <Link href="/refunds/new">New refund</Link>
            </Button>
          )
        }
      />

      <Card className="gap-0 overflow-hidden pb-0">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <nav className="flex flex-wrap gap-1" aria-label="Filter by status">
            {tabs.map((t) => (
              <Link
                key={t.label}
                href={href(t.key)}
                aria-current={status === t.key ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  status === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {t.label} <span className="tabular opacity-70">{t.count}</span>
              </Link>
            ))}
          </nav>
          <form className="relative" action="/refunds">
            {status && <input type="hidden" name="status" value={status} />}
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q} placeholder="Order, customer or email" aria-label="Search refunds" className="h-8 w-64 pl-8" />
          </form>
        </CardHeader>
        <RefundTable refunds={shown} empty={q ? `No refunds match “${q}”.` : "No refunds in this state."} />
      </Card>
    </div>
  );
}
