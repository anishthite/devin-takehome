import { ArrowDownLeft, ArrowUpRight, Clock, ShieldCheck, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { auth } from "@/auth";
import { currentActor } from "@/lib/kit/authz";
import { getKitServices } from "@/lib/kit/services";
import { formatCompactMoney, formatDate, formatMoney } from "@/lib/ledger/format";
import { MOCK_OPENING_BALANCE_MINOR, mockLedger } from "@/demo/ledger";
import { summarize } from "@/lib/ledger/summary";
import type { DailyFlow, EntryStatus } from "@/lib/ledger/types";
import { ROLE_LABELS } from "@/lib/roles";

const STATUS_STYLES: Record<EntryStatus, string> = {
  posted: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  failed: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <span className={`grid size-8 place-items-center rounded-lg ${tone}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="tabular mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

function FlowChart({ daily }: { daily: DailyFlow[] }) {
  const max = Math.max(1, ...daily.flatMap((d) => [d.inflowMinor, d.outflowMinor]));
  return (
    <div className="flex h-48 items-end gap-1.5">
      {daily.map((d) => (
        <div
          key={d.date}
          className="group relative flex h-full flex-1 items-end justify-center gap-0.5"
          title={`${formatDate(d.date)} · in ${formatMoney(d.inflowMinor)} · out ${formatMoney(d.outflowMinor)}`}
        >
          <div
            className="w-full max-w-3 rounded-t bg-emerald-500 transition group-hover:bg-emerald-600"
            style={{ height: `${(d.inflowMinor / max) * 100}%` }}
          />
          <div
            className="w-full max-w-3 rounded-t bg-zinc-300 transition group-hover:bg-zinc-400"
            style={{ height: `${(d.outflowMinor / max) * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;
  const actor = await currentActor();
  const { dataverse } = await getKitServices();
  const now = new Date();
  const entries = mockLedger(now);
  const summary = summarize(entries, MOCK_OPENING_BALANCE_MINOR, now, 14);
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {firstName ? `Welcome back, ${firstName}` : "Dashboard"}
          </h1>
          <p className="text-sm text-zinc-500">Here&apos;s what moved through the ledger in the last 14 days.</p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20">
          Sample data
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Balance"
          value={formatMoney(summary.balanceMinor)}
          hint="Posted entries only"
          icon={Wallet}
          tone="bg-zinc-900 text-white"
        />
        <StatCard
          label="Inflow · 14d"
          value={formatMoney(summary.inflowMinor)}
          hint="Incoming payments"
          icon={ArrowDownLeft}
          tone="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          label="Outflow · 14d"
          value={formatMoney(summary.outflowMinor)}
          hint="Outgoing payments"
          icon={ArrowUpRight}
          tone="bg-zinc-100 text-zinc-700"
        />
        <StatCard
          label="Pending"
          value={`${summary.pendingCount}`}
          hint={`${formatMoney(summary.pendingMinor, "USD", { signed: true })} net awaiting settlement`}
          icon={Clock}
          tone="bg-amber-50 text-amber-700"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Cash flow</h2>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" /> In
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-zinc-300" /> Out
              </span>
            </div>
          </div>
          <FlowChart daily={summary.daily} />
          <div className="mt-2 flex justify-between text-xs text-zinc-400">
            <span>{formatDate(summary.daily[0].date)}</span>
            <span>Today</span>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="size-5 text-emerald-600" />
            <h2 className="font-semibold">Your access</h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-zinc-500">Signed in as</dt>
              <dd className="truncate font-medium">{user?.email ?? user?.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">
                {dataverse === "off" ? "Entra app roles" : "Dataverse security roles"}
              </dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {actor.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
                  >
                    {ROLE_LABELS[role]}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Tenant</dt>
              <dd className="truncate font-mono text-xs text-zinc-700">{user?.tenantId}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Object ID</dt>
              <dd className="truncate font-mono text-xs text-zinc-700">{user?.id}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-semibold">Recent payments</h2>
          <span className="text-xs text-zinc-500">
            Total 30d volume {formatCompactMoney(entries.reduce((sum, e) => sum + Math.abs(e.amountMinor), 0))}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-zinc-100 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Counterparty</th>
                <th className="px-5 py-2.5 font-medium">Method</th>
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {entries.slice(0, 8).map((e) => (
                <tr key={e.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3">
                    <p className="font-medium">{e.counterparty}</p>
                    <p className="text-xs text-zinc-500">{e.description}</p>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{e.method}</td>
                  <td className="px-5 py-3 text-zinc-600">{formatDate(e.occurredAt)}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${STATUS_STYLES[e.status]}`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td
                    className={`tabular px-5 py-3 text-right font-medium ${
                      e.amountMinor >= 0 ? "text-emerald-700" : "text-zinc-900"
                    }`}
                  >
                    {formatMoney(e.amountMinor, e.currency, { signed: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
