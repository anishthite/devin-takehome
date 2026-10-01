import { FlaskConical } from "lucide-react";
import { signIn } from "@/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { PersonaButton } from "./persona-button";
import { DEMO_PERSONAS } from "./personas";
import { DEMO_PROVIDER_ID } from "./idp/config";

export function DemoSignInOptions({ redirectTo }: { redirectTo: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <FlaskConical className="mt-0.5 size-4 shrink-0" />
        <p>Demo mode: pick a persona. Sign-in runs a real OIDC flow against a built-in mock Entra, and all data is mocked.</p>
      </div>
      {DEMO_PERSONAS.map((persona) => (
        <PersonaButton
          key={persona.id}
          name={persona.name}
          blurb={persona.blurb}
          roleLabel={ROLE_LABELS[persona.role]}
          start={async (): Promise<string> => {
            "use server";
            return signIn(DEMO_PROVIDER_ID, { redirectTo, redirect: false }, { login_hint: persona.email });
          }}
        />
      ))}
    </div>
  );
}
