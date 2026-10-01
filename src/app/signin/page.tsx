import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth, signIn } from "@/auth";
import { Logo, MicrosoftMark } from "@/components/logo";

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

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const params = await searchParams;
  const redirectTo = safeRedirect(params.callbackUrl);
  if (await auth()) redirect(redirectTo);

  const errorCode = typeof params.error === "string" ? params.error : undefined;
  const error = errorCode ? (ERRORS[errorCode] ?? "Sign-in failed. Please try again.") : undefined;

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-zinc-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 size-[28rem] rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 size-[26rem] rounded-full bg-sky-500/10 blur-3xl" />
        <Logo className="relative text-lg" />
        <div className="relative max-w-md space-y-4">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Every payment, accounted for.
          </h1>
          <p className="text-zinc-400">
            Track inflows, outflows and approvals across your organization — secured by your
            company&apos;s Microsoft Entra ID.
          </p>
        </div>
        <p className="relative text-sm text-zinc-500">© {new Date().getFullYear()} Ledger</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <Logo className="text-lg lg:hidden" />
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-zinc-500">Use your work account to continue.</p>
          </div>

          {error && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form
            action={async () => {
              "use server";
              await signIn("microsoft-entra-id", { redirectTo });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              <MicrosoftMark />
              Sign in with Microsoft
            </button>
          </form>

          <p className="flex items-start gap-2 text-xs text-zinc-500">
            <ShieldCheck className="mt-px size-4 shrink-0 text-emerald-600" />
            Only members of your organization&apos;s Entra tenant with an assigned Ledger role can sign in.
          </p>
        </div>
      </section>
    </main>
  );
}
