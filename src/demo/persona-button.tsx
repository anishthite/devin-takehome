"use client";

import { useTransition } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/ui-components/badge";
import { Button } from "@/ui-components/button";

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
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          // Full navigation: the IdP and callback are route handlers, not App Router pages.
          window.location.assign(await start());
        })
      }
      className="group h-auto w-full justify-start gap-3 bg-card px-4 py-3 text-left whitespace-normal hover:border-brand/40 hover:bg-brand-soft/40 disabled:cursor-wait disabled:opacity-70"
    >
      <Avatar name={name} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{name}</span>
        <span className="block truncate text-xs font-normal text-muted-foreground">{blurb}</span>
      </span>
      <Badge variant="secondary">{roleLabel}</Badge>
      {pending ? (
        <Loader2 className="animate-spin text-brand-strong" />
      ) : (
        <ChevronRight className="text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-brand-strong" />
      )}
    </Button>
  );
}
