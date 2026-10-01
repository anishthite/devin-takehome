import { FlaskConical } from "lucide-react";
import { signIn } from "@/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { DEMO_PERSONAS } from "./personas";
import { DEMO_PROVIDER_ID } from "./provider";

export function DemoSignInOptions({ redirectTo }: { redirectTo: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <FlaskConical className="mt-0.5 size-4 shrink-0" />
        <p>Demo mode: pick a persona. No Microsoft account needed, and all data is mocked.</p>
      </div>
      {DEMO_PERSONAS.map((persona) => (
        <form
          key={persona.id}
          action={async () => {
            "use server";
            await signIn(DEMO_PROVIDER_ID, { personaId: persona.id, redirectTo });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            <span>
              <span className="block text-sm font-medium">{persona.name}</span>
              <span className="block text-xs text-zinc-500">{persona.blurb}</span>
            </span>
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
              {ROLE_LABELS[persona.role]}
            </span>
          </button>
        </form>
      ))}
    </div>
  );
}
