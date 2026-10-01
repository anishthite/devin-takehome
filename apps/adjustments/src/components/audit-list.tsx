import type { AuditLogEntry } from "@kit/services/audit-log";
import { Amount } from "@kit/ui/amount";
import { formatTime } from "@/lib/format";

function display(attribute: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number" && /Minor$/.test(attribute)) return <Amount value={value} minor size="sm" />;
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function AuditList({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <ol className="divide-y border-t">
      {entries.length === 0 && <li className="px-6 py-6 text-center text-sm text-muted-foreground">No audit entries.</li>}
      {entries.map((e) => (
        <li key={e.id} className="px-6 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{e.action}</span>
            <span className="text-secondary-foreground">by {e.actorName}</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {e.target.type}/{e.target.id.slice(0, 8)}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">{formatTime(e.occurredAt)}</span>
          </div>
          {e.changes.length > 0 && (
            <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-0.5 text-xs">
              {e.changes.map((c) => (
                <div key={c.attribute} className="contents">
                  <dt className="font-mono text-muted-foreground">{c.attribute}</dt>
                  <dd className="text-secondary-foreground">
                    {display(c.attribute, c.oldValue)} → {display(c.attribute, c.newValue)}
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
