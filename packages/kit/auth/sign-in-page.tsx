import { redirect } from "next/navigation";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { auth, signIn } from "@kit/auth";
import { MicrosoftMark } from "@kit/components/microsoft-mark";
import { isDemoMode } from "@kit/demo/mode";
import { DemoSignInOptions } from "@kit/demo/sign-in-options";
import { Alert, AlertDescription } from "@kit/ui/alert";
import { Button } from "@kit/ui/button";
import { Logo } from "@kit/ui/logo";

const ERRORS: Record<string, string> = {
  AccessDenied:
    "Your account isn't allowed to use this app. Ask an admin to assign you a Ledger role in Microsoft Entra.",
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

export interface SignInBrand {
  appName: string;
  headline: string;
  tagline: string;
}

const LEDGER: SignInBrand = {
  appName: "Ledger",
  headline: "Every payment, accounted for.",
  tagline: "Track inflows, outflows and approvals across your organization",
};

/** Sign-in page with an app's own wordmark and copy; the default export is Ledger's. */
export function createSignInPage(brand: SignInBrand) {
  return function SignInPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    return <BrandedSignInPage brand={brand} {...props} />;
  };
}

export default createSignInPage(LEDGER);

async function BrandedSignInPage({
  brand,
  searchParams,
}: {
  brand: SignInBrand;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const redirectTo = safeRedirect(params.callbackUrl);
  if (await auth()) redirect(redirectTo);

  const errorCode = typeof params.error === "string" ? params.error : undefined;
  const signedOut = params.signedOut === "1" && !errorCode;
  const error = errorCode ? (ERRORS[errorCode] ?? "Sign-in failed. Please try again.") : undefined;

  const demo = isDemoMode();

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="dark hidden bg-ink-glow p-12 text-ink-foreground lg:flex lg:flex-col lg:justify-between">
        <Logo className="text-lg" name={brand.appName} />
        <div className="max-w-md space-y-4">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">{brand.headline}</h1>
          <p className="text-muted-foreground">
            {brand.tagline}
            {demo ? " — shown here with sample data." : " — secured by your company’s Microsoft Entra ID."}
          </p>
        </div>
        <p className="text-sm text-muted-foreground/80">© {new Date().getFullYear()} {brand.appName}</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <Logo className="text-lg lg:hidden" name={brand.appName} />
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              {demo ? "Choose a demo persona to explore the app." : "Use your work account to continue."}
            </p>
          </div>

          {signedOut && (
            <Alert variant="success" role="status">
              <CheckCircle2 />
              <AlertDescription>You&apos;ve been signed out.</AlertDescription>
            </Alert>
          )}

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
