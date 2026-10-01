"use client";

import { useTransition } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { Avatar } from "@/components/avatar";

interface Props {
  name: string;
  blurb: string;
  roleLabel: string;
  /** Starts the OIDC flow server-side and returns the IdP authorization URL. */
  start: () => Promise<string>;
}

export function PersonaButton({ name, blurb, roleLabel, start }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          // Full navigation: the IdP and callback are route handlers, not App Router pages.
          window.location.assign(await start());
        })
      }
      className="group flex w-full items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-wait disabled:opacity-70"
    >
      <Avatar name={name} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{name}</span>
        <span className="block truncate text-xs text-zinc-500">{blurb}</span>
      </span>
      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{roleLabel}</span>
      {pending ? (
        <Loader2 className="size-4 animate-spin text-emerald-600" />
      ) : (
        <ChevronRight className="size-4 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
      )}
    </button>
  );
}
