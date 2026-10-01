import Link from "next/link";
import { Workflow } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { requireRole } from "@/lib/kit/authz";
import { getKitServices } from "@/lib/kit/services";
import type { FlowApprovalView } from "@/lib/dataverse/flow-approvals";
import { formatMoney } from "@/lib/ledger/format";
import { hasRole } from "@/lib/roles";
import { cancelApproval, decideApproval, submitApproval } from "./actions";

const time = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
const formatTime = (iso: string) => `${time.format(new Date(iso))} UTC`;

const input =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none";
const button = "rounded-lg px-3 py-1.5 text-xs font-medium transition";

export default async function ApprovalsPage({ searchParams }: PageProps<"/approvals">) {
  const actor = await requireRole("Ledger.Viewer");
  const { error } = await searchParams;
  const services = await getKitServices();
  const requests = await services.approvals.list();
  const canSubmit = hasRole(actor.roles, "Ledger.Operator");
  const canDecide = hasRole(actor.roles, "Ledger.Approver");

  let flowApprovals: FlowApprovalView[] | null = null;
  let flowError: string | null = null;
  if (services.flowApprovals) {
    try {
      flowApprovals = await services.flowApprovals.list();
    } catch (e) {
      flowError = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-sm text-zinc-500">
          Maker-checker: operators submit, a different approver decides.
          {services.dataverse !== "off" && " Status is mirrored to Dataverse; this list is the source of truth."}
        </p>
      </div>

      {typeof error === "string" && (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700 ring-1 ring-rose-600/20">
          {error}
        </p>
      )}

      {canSubmit && (
        <form action={submitApproval} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-4">
          <h2 className="font-semibold sm:col-span-4">Request approval</h2>
          <input name="title" required placeholder="What is this payment for?" className={input} aria-label="Title" />
          <input name="counterparty" required placeholder="Counterparty" className={input} aria-label="Counterparty" />
          <input name="amount" required inputMode="decimal" placeholder="Amount (USD)" className={input} aria-label="Amount" />
          <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
            Submit for approval
          </button>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <h2 className="px-5 py-4 font-semibold">Ledger approval requests</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-zinc-100 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Request</th>
                <th className="px-5 py-2.5 font-medium">Requested by</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                <th className="px-5 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {requests.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-zinc-500">
                    No approval requests yet.
                  </td>
                </tr>
              )}
              {requests.map((r) => {
                const pending = r.status === "pending";
                const own = r.requestedById === actor.id;
                return (
                  <tr key={r.id} className="align-top">
                    <td className="px-5 py-3">
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-zinc-500">{r.counterparty}</p>
                      {r.mirror && <p className="mt-1 text-[11px] text-sky-700">Mirrored to {r.mirror.entitySet}</p>}
                      {r.mirrorError && <p className="mt-1 text-[11px] text-rose-700">Mirror failed: {r.mirrorError}</p>}
                    </td>
                    <td className="px-5 py-3 text-zinc-600">
                      <p>{r.requestedByName}</p>
                      <p className="text-xs text-zinc-500">{formatTime(r.requestedAt)}</p>
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill value={r.status} />
                      {r.decidedByName && <p className="mt-1 text-xs text-zinc-500">by {r.decidedByName}</p>}
                      {r.comment && <p className="mt-1 text-xs italic text-zinc-500">“{r.comment}”</p>}
                    </td>
                    <td className="tabular px-5 py-3 text-right font-medium">{formatMoney(r.amountMinor, r.currency)}</td>
                    <td className="space-y-2 px-5 py-3">
                      {pending && canDecide && !own && (
                        <form action={decideApproval} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="id" value={r.id} />
                          <input name="comment" placeholder="Comment" className={`${input} w-36 py-1 text-xs`} aria-label="Comment" />
                          <button name="decision" value="approved" className={`${button} bg-emerald-600 text-white hover:bg-emerald-700`}>
                            Approve
                          </button>
                          <button name="decision" value="rejected" className={`${button} bg-rose-50 text-rose-700 hover:bg-rose-100`}>
                            Reject
                          </button>
                        </form>
                      )}
                      {pending && own && (
                        <form action={cancelApproval}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className={`${button} bg-zinc-100 text-zinc-700 hover:bg-zinc-200`}>Cancel</button>
                        </form>
                      )}
                      {canDecide && (
                        <Link href={`/audit?request=${r.id}`} className="block text-xs font-medium text-emerald-700 hover:underline">
                          Audit trail
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {services.flowApprovals && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <Workflow className="size-5 text-sky-600" />
            <h2 className="font-semibold">Power Automate approvals</h2>
          </div>
          <p className="mb-4 text-xs text-zinc-500">Read-only, from msdyn_flow_approval. Respond to these in Power Automate.</p>
          {flowError && <p className="text-sm text-rose-700">Couldn&apos;t load Power Automate approvals: {flowError}</p>}
          {flowApprovals?.length === 0 && <p className="text-sm text-zinc-500">No Power Automate approvals.</p>}
          <ul className="divide-y divide-zinc-100">
            {flowApprovals?.map((a) => (
              <li key={a.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{a.title}</p>
                  <span className="text-xs text-zinc-500">
                    {a.stage}
                    {a.result && ` · ${a.result}`}
                  </span>
                </div>
                {a.details && <p className="text-xs text-zinc-500">{a.details}</p>}
                <p className="mt-1 text-xs text-zinc-400">
                  {a.owner ? `Requested by ${a.owner} · ` : ""}
                  {formatTime(a.createdOn)}
                </p>
                {a.responses.map((r) => (
                  <p key={r.id} className="mt-1 text-xs text-zinc-600">
                    {r.responder ?? "Someone"} responded <strong>{r.response}</strong>
                    {r.comments && ` — “${r.comments}”`}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
