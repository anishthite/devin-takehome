import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth, signIn } from "@/auth";
import { MicrosoftMark } from "@/components/microsoft-mark";
import { isDemoMode } from "@/demo/mode";
import { DemoSignInOptions } from "@/demo/sign-in-options";
import { Alert, AlertDescription } from "@/ui-components/alert";
import { Button } from "@/ui-components/button";
import { Logo } from "@/ui-components/logo";

const ERRORS: Record<string, string> = {
  AccessDenied:
    "Your account isn't allowed to use this app. Ask an admin to assign you a Ledger role in Microsoft Entra.",
  CredentialsSignin: "Unknown demo persona. Pick one of the options below.",
  Configuration: "Sign-in is misconfigured on the server. Check the Entra app registration settings.",
};

/** Reduces a callback URL to a same-app path so it can never redirect off-site. */
function safeRedirect(value: string | string[] | undefined): string {
  if (typeof value !== "string") return "/";
  try {
    const url = new URL(value, "http://localhost");
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith("//") ? "/" : path;
  } catch {
    return "/";
  }
}

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const params = await searchParams;
  const redirectTo = safeRedirect(params.callbackUrl);
  if (await auth()) redirect(redirectTo);

  const errorCode = typeof params.error === "string" ? params.error : undefined;
  const error = errorCode ? (ERRORS[errorCode] ?? "Sign-in failed. Please try again.") : undefined;

  const demo = isDemoMode();

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="dark hidden bg-ink-glow p-12 text-ink-foreground lg:flex lg:flex-col lg:justify-between">
        <Logo className="text-lg" />
        <div className="max-w-md space-y-4">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Every payment, accounted for.
          </h1>
          <p className="text-muted-foreground">
            Track inflows, outflows and approvals across your organization — secured by your
            company&apos;s Microsoft Entra ID.
          </p>
        </div>
        <p className="text-sm text-muted-foreground/80">© {new Date().getFullYear()} Ledger</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <Logo className="text-lg lg:hidden" />
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              {demo ? "Choose a demo persona to explore the app." : "Use your work account to continue."}
            </p>
          </div>

          {error && (
            <Alert variant="danger">
              <AlertDescription className="text-loss">{error}</AlertDescription>
            </Alert>
          )}

          {demo ? (
            <DemoSignInOptions redirectTo={redirectTo} />
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("microsoft-entra-id", { redirectTo });
              }}
            >
              <Button type="submit" variant="outline" size="lg" className="w-full gap-3 border-input bg-card">
                <MicrosoftMark />
                Sign in with Microsoft
              </Button>
            </form>
          )}

          {!demo && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-px size-4 shrink-0 text-brand-strong" />
              Only members of your organization&apos;s Entra tenant with an assigned Ledger role can sign in.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
