import { FlaskConical } from "lucide-react";
import { signIn } from "@/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { Alert, AlertDescription } from "@/ui-components/alert";
import { Badge } from "@/ui-components/badge";
import { Button } from "@/ui-components/button";
import { DEMO_PERSONAS } from "./personas";
import { DEMO_PROVIDER_ID } from "./provider";

export function DemoSignInOptions({ redirectTo }: { redirectTo: string }) {
  return (
    <div className="space-y-3">
      <Alert variant="warning">
        <FlaskConical />
        <AlertDescription>
          Demo mode: pick a persona. No Microsoft account needed, and all data is mocked.
        </AlertDescription>
      </Alert>
      {DEMO_PERSONAS.map((persona) => (
        <form
          key={persona.id}
          action={async () => {
            "use server";
            await signIn(DEMO_PROVIDER_ID, { personaId: persona.id, redirectTo });
          }}
        >
          <Button
            type="submit"
            variant="outline"
            className="h-auto w-full justify-between gap-3 bg-card px-4 py-3 text-left whitespace-normal"
          >
            <span>
              <span className="block text-sm font-medium">{persona.name}</span>
              <span className="block text-xs font-normal text-muted-foreground">{persona.blurb}</span>
            </span>
            <Badge variant="secondary">{ROLE_LABELS[persona.role]}</Badge>
          </Button>
        </form>
      ))}
    </div>
  );
}
