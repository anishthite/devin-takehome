import { notFound } from "next/navigation";
import { ChevronRight, FlaskConical } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { MicrosoftMark } from "@/components/logo";
import { isDemoMode } from "@/demo/mode";
import { DEMO_PERSONAS } from "@/demo/personas";
import { ROLE_LABELS } from "@/lib/roles";

export const dynamic = "force-dynamic";

export const metadata = { title: "Demo Entra ID · Pick an account" };

/** Account picker of the mock IdP, shown when /demo-idp/authorize gets no login_hint. */
export default async function DemoIdpLoginPage({ searchParams }: PageProps<"/demo-idp/login">) {
  if (!isDemoMode()) notFound();
  const params = await searchParams;
  const hidden = Object.entries(params).flatMap(([name, value]) =>
    typeof value === "string" ? [{ name, value }] : [],
  );

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-100 p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="space-y-6 rounded-xl bg-white p-8 shadow-lg ring-1 ring-zinc-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <MicrosoftMark />
            Demo Entra ID
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Pick an account</h1>
            <p className="text-sm text-zinc-500">to continue to Ledger</p>
          </div>
          <form method="post" action="/demo-idp/authorize" className="-mx-2 space-y-1">
            {hidden.map(({ name, value }) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            {DEMO_PERSONAS.map((persona) => (
              <button
                key={persona.id}
                type="submit"
                name="persona"
                value={persona.id}
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-emerald-500"
              >
                <Avatar name={persona.name} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{persona.name}</span>
                  <span className="block truncate text-xs text-zinc-500">{persona.email}</span>
                </span>
                <span className="text-xs text-zinc-500">{ROLE_LABELS[persona.role]}</span>
                <ChevronRight className="size-4 text-zinc-300 group-hover:text-zinc-600" />
              </button>
            ))}
          </form>
        </div>
        <p className="flex items-center justify-center gap-1.5 text-xs text-zinc-500">
          <FlaskConical className="size-3.5" />
          Mock identity provider. No real Microsoft accounts are used.
        </p>
      </div>
    </main>
  );
}
