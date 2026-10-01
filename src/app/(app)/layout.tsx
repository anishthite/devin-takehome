import { redirect } from "next/navigation";
import { ArrowLeftRight, CheckCircle2, LayoutDashboard, Settings } from "lucide-react";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import { NavLink } from "@/components/nav-link";
import { UserMenu } from "@/components/user-menu";

const SOON = [
  { label: "Ledger", icon: ArrowLeftRight },
  { label: "Approvals", icon: CheckCircle2 },
  { label: "Settings", icon: Settings },
];

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white px-4 py-5 md:flex">
        <Logo className="px-2" />
        <nav className="mt-8 space-y-1">
          <NavLink href="/">
            <LayoutDashboard className="size-4" />
            Dashboard
          </NavLink>
          {SOON.map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400"
            >
              <Icon className="size-4" />
              {label}
              <span className="ml-auto rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                Soon
              </span>
            </span>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6">
          <Logo className="md:hidden" />
          <div className="hidden md:block" />
          <UserMenu user={session.user} />
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
