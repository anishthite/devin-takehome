import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { approvalTarget } from "@/lib/kit/approvals";
import { fromAuditLog, mergeAuditTrail, type AuditViewerEntry } from "@/lib/kit/audit-reader";
import { requireRole } from "@/lib/kit/authz";
import { getKitServices } from "@/lib/kit/services";

const time = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" });

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "string" ? value : JSON.stringify(value);
}

const SOURCE_LABELS = { kit: "Kit audit_log", dataverse: "Dataverse" } as const;

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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit</h1>
        <p className="text-sm text-zinc-500">
          The kit&apos;s audit_log merged with Dataverse record change history (RetrieveRecordChangeHistory) for mirrored
          requests.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <nav className="space-y-1 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <Link
            href="/audit"
            className={`block rounded-lg px-3 py-2 text-sm ${!selected ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}
          >
            All kit activity
          </Link>
          {requests.map((r) => (
            <Link
              key={r.id}
              href={`/audit?request=${r.id}`}
              className={`block rounded-lg px-3 py-2 text-sm ${selected?.id === r.id ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}
            >
              <span className="block font-medium">{r.title}</span>
              <span className="block text-xs opacity-70">
                {r.counterparty} · {r.status}
              </span>
            </Link>
          ))}
        </nav>

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:col-span-2">
          <div className="px-5 py-4">
            <h2 className="font-semibold">{selected ? selected.title : "All kit activity"}</h2>
            {selected && !selected.mirror && (
              <p className="text-xs text-zinc-500">Not mirrored to Dataverse, so only kit entries are shown.</p>
            )}
            {dataverseError && <p className="text-xs text-rose-700">Couldn&apos;t load Dataverse history: {dataverseError}</p>}
          </div>
          <ol className="divide-y divide-zinc-100 border-t border-zinc-100">
            {entries.length === 0 && <li className="px-5 py-6 text-center text-sm text-zinc-500">No audit entries.</li>}
            {entries.map((e) => (
              <li key={`${e.source}:${e.id}`} className="px-5 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill value={e.source} label={SOURCE_LABELS[e.source]} />
                  <span className="font-medium">{e.action}</span>
                  <span className="text-zinc-600">by {e.actorName}</span>
                  {e.callingUserName && <span className="text-xs text-zinc-400">via {e.callingUserName}</span>}
                  <span className="ml-auto text-xs text-zinc-500">{time.format(new Date(e.occurredAt))} UTC</span>
                </div>
                {e.changes.length > 0 && (
                  <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-0.5 text-xs">
                    {e.changes.map((c) => (
                      <div key={c.attribute} className="contents">
                        <dt className="font-mono text-zinc-500">{c.attribute}</dt>
                        <dd className="text-zinc-700">
                          {display(c.oldValue)} → {display(c.newValue)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
