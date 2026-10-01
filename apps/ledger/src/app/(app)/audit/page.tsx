import Link from "next/link";
import { approvalTarget } from "@kit/services/approvals";
import { fromAuditLog, mergeAuditTrail, type AuditSource, type AuditViewerEntry } from "@kit/services/audit-reader";
import { requireRole } from "@kit/services/authz";
import { getKitServices } from "@kit/services/services";
import { cn } from "@kit/lib/utils";
import { Badge } from "@kit/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { PageHeader } from "@kit/ui/page-header";

const time = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" });

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "string" ? value : JSON.stringify(value);
}

const SOURCES: Record<AuditSource, { label: string; variant: "default" | "info" }> = {
  kit: { label: "Kit audit_log", variant: "default" },
  dataverse: { label: "Dataverse", variant: "info" },
};

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  await requireRole("Ledger.Approver");
  const { request: requestId } = await searchParams;
  const services = await getKitServices();
  const requests = await services.approvals.list();
  const selected = requests.find((r) => r.id === requestId) ?? null;

  let entries: AuditViewerEntry[];
  let dataverseError: string | null = null;
  if (selected) {
    const kit = await services.auditLog.list(approvalTarget(selected.id));
    let dataverse: AuditViewerEntry[] = [];
    if (services.auditReader && selected.mirror) {
      try {
        dataverse = await services.auditReader.recordChangeHistory(selected.mirror);
      } catch (e) {
        dataverseError = e instanceof Error ? e.message : String(e);
      }
    }
    entries = mergeAuditTrail(kit, dataverse);
  } else {
    entries = (await services.auditLog.list()).map(fromAuditLog);
  }

  const navItem = (active: boolean) =>
    cn(
      "block rounded-md px-3 py-2 text-sm",
      active ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground",
    );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Audit"
        description="The kit's audit_log merged with Dataverse record change history (RetrieveRecordChangeHistory) for mirrored requests."
      />

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card className="py-3">
          <nav className="space-y-1 px-3">
            <Link href="/audit" className={navItem(!selected)}>
              All kit activity
            </Link>
            {requests.map((r) => (
              <Link key={r.id} href={`/audit?request=${r.id}`} className={navItem(selected?.id === r.id)}>
                <span className="block font-medium">{r.title}</span>
                <span className="block text-xs opacity-70">
                  {r.counterparty} · {r.status}
                </span>
              </Link>
            ))}
          </nav>
        </Card>

        <Card className="gap-0 overflow-hidden lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle>{selected ? selected.title : "All kit activity"}</CardTitle>
            {selected && !selected.mirror && (
              <CardDescription>Not mirrored to Dataverse, so only kit entries are shown.</CardDescription>
            )}
            {dataverseError && (
              <CardDescription className="text-loss">Couldn&apos;t load Dataverse history: {dataverseError}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="px-0">
            <ol className="divide-y border-t">
              {entries.length === 0 && <li className="px-6 py-6 text-center text-sm text-muted-foreground">No audit entries.</li>}
              {entries.map((e) => (
                <li key={`${e.source}:${e.id}`} className="px-6 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={SOURCES[e.source].variant}>{SOURCES[e.source].label}</Badge>
                    <span className="font-medium">{e.action}</span>
                    <span className="text-secondary-foreground">by {e.actorName}</span>
                    {e.callingUserName && <span className="text-xs text-muted-foreground">via {e.callingUserName}</span>}
                    <span className="ml-auto text-xs text-muted-foreground">{time.format(new Date(e.occurredAt))} UTC</span>
                  </div>
                  {e.changes.length > 0 && (
                    <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-0.5 text-xs">
                      {e.changes.map((c) => (
                        <div key={c.attribute} className="contents">
                          <dt className="font-mono text-muted-foreground">{c.attribute}</dt>
                          <dd className="text-secondary-foreground">
                            {display(c.oldValue)} → {display(c.newValue)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
