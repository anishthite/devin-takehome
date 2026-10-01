import { FlaskConical } from "lucide-react";
import { signIn } from "@kit/auth";
import { ROLE_LABELS } from "@kit/auth/roles";
import { Alert, AlertDescription } from "@kit/ui/alert";
import { PersonaButton } from "./persona-button";
import { DEMO_PERSONAS } from "./personas";
import { DEMO_PROVIDER_ID } from "./idp/config";

export function DemoSignInOptions({ redirectTo }: { redirectTo: string }) {
  return (
    <div className="space-y-3">
      <Alert variant="warning">
        <FlaskConical />
        <AlertDescription>
          Demo mode: pick a persona. Sign-in runs a real OIDC flow against a built-in mock Entra, and all
          data is mocked.
        </AlertDescription>
      </Alert>
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
