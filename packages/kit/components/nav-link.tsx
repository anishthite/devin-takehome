"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@kit/lib/utils";
import { buttonVariants } from "@kit/ui/button";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        buttonVariants({ variant: active ? "default" : "ghost" }),
        "w-full justify-start gap-3 px-3",
        !active && "text-sidebar-foreground",
      )}
    >
      {children}
    </Link>
  );
}
