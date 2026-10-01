import { requireRole } from "@kit/services/authz";
import { auditCsv } from "@/lib/refunds/csv";
import { getRefunds } from "@/lib/refunds/server";

export async function GET() {
  const actor = await requireRole("Ledger.Admin");
  const refunds = await getRefunds();
  const entries = await refunds.activity();
  const stamp = new Date().toISOString().slice(0, 10);
  await refunds.recordExport(actor, entries.length);
  return new Response(auditCsv(entries), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="refunds-audit-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
