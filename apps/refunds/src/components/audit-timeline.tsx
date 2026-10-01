import { Badge } from "@kit/ui/badge";
import type { AuditSource, AuditViewerEntry } from "@kit/services/audit-reader";
import { formatDateTime } from "@/lib/refunds/format";

const SOURCES: Record<AuditSource, { label: string; variant: "default" | "info" }> = {
  kit: { label: "Kit audit_log", variant: "default" },
  dataverse: { label: "Dataverse", variant: "info" },
};

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function AuditTimeline({ entries, showTarget = false }: { entries: readonly AuditViewerEntry[]; showTarget?: boolean }) {
  return (
    <ol className="divide-y border-t">
      {entries.length === 0 && <li className="px-6 py-6 text-center text-sm text-muted-foreground">No audit entries.</li>}
      {entries.map((e) => (
        <li key={`${e.source}:${e.id}`} className="px-6 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={SOURCES[e.source].variant}>{SOURCES[e.source].label}</Badge>
            <span className="font-medium">{e.action}</span>
            <span className="text-secondary-foreground">by {e.actorName}</span>
            {e.callingUserName && <span className="text-xs text-muted-foreground">via {e.callingUserName}</span>}
            {showTarget && (
              <span className="font-mono text-xs text-muted-foreground">
                {e.target.type}/{e.target.id}
              </span>
            )}
            <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(e.occurredAt)}</span>
          </div>
          {e.changes.length > 0 && (
            <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-0.5 text-xs">
              {e.changes.map((c) => (
                <div key={c.attribute} className="contents">
                  <dt className="font-mono text-muted-foreground">{c.attribute}</dt>
                  <dd className="break-all text-secondary-foreground">
                    {display(c.oldValue)} → {display(c.newValue)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </li>
      ))}
    </ol>
  );
}
