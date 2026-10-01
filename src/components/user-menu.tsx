import { LogOut } from "lucide-react";
import type { Session } from "next-auth";
import { signOut } from "@/auth";
import { ROLE_LABELS, highestRole } from "@/lib/roles";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserMenu({ user }: { user: Session["user"] }) {
  const name = user.name ?? user.email ?? "Signed in";
  const role = highestRole(user.roles);

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-zinc-100">
        <span className="grid size-8 place-items-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
          {initials(name)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight">{name}</span>
          {role && <span className="block text-xs text-zinc-500">{ROLE_LABELS[role]}</span>}
        </span>
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg">
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium">{name}</p>
          {user.email && <p className="truncate text-xs text-zinc-500">{user.email}</p>}
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
