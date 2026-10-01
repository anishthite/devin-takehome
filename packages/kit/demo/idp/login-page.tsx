import { notFound } from "next/navigation";
import { APP_NAME } from "@kit/app";
import { ChevronRight, FlaskConical } from "lucide-react";
import { Avatar } from "@kit/components/avatar";
import { MicrosoftMark } from "@kit/components/microsoft-mark";
import { isDemoMode } from "@kit/demo/mode";
import { DEMO_PERSONAS } from "@kit/demo/personas";
import { ROLE_LABELS } from "@kit/auth/roles";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";

/** Account picker of the mock IdP, shown when /demo-idp/authorize gets no login_hint. */
export default async function DemoIdpLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!isDemoMode()) notFound();
  const params = await searchParams;
  const hidden = Object.entries(params).flatMap(([name, value]) =>
    typeof value === "string" ? [{ name, value }] : [],
  );

  return (
    <main className="grid min-h-screen place-items-center bg-muted p-6">
      <div className="w-full max-w-md space-y-4">
        <Card className="gap-6 py-8 shadow-lg">
          <CardHeader className="gap-6 px-8">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <MicrosoftMark />
              Demo Entra ID
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl">Pick an account</CardTitle>
              <CardDescription>to continue to {APP_NAME}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-6">
            <form method="post" action="/demo-idp/authorize" className="space-y-1">
              {hidden.map(({ name, value }) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
              {DEMO_PERSONAS.map((persona) => (
                <Button
                  key={persona.id}
                  type="submit"
                  name="persona"
                  value={persona.id}
                  variant="ghost"
                  className="group h-auto w-full justify-start gap-3 px-3 py-2.5 text-left"
                >
                  <Avatar name={persona.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{persona.name}</span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {persona.email}
                    </span>
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">{ROLE_LABELS[persona.role]}</span>
                  <ChevronRight className="text-muted-foreground/50 group-hover:text-foreground" />
                </Button>
              ))}
            </form>
          </CardContent>
        </Card>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <FlaskConical className="size-3.5" />
          Mock identity provider. No real Microsoft accounts are used.
        </p>
      </div>
    </main>
  );
}
