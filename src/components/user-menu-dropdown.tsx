"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, Loader2, LogOut } from "lucide-react";
import { Avatar } from "./avatar";

interface Props {
  name: string;
  email?: string;
  roleLabel?: string;
  signOutAction: () => Promise<void>;
}

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function UserMenuDropdown({ name, email, roleLabel, signOutAction }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-emerald-500"
      >
        <Avatar name={name} />
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight">{name}</span>
          {roleLabel && <span className="block text-xs text-zinc-500">{roleLabel}</span>}
        </span>
        <ChevronDown className={`size-4 text-zinc-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg"
        >
          <div className="border-b border-zinc-100 px-3 pb-2.5 pt-1.5">
            <p className="text-xs text-zinc-500">Signed in as</p>
            <p className="truncate text-sm font-medium">{email ?? name}</p>
          </div>
          <form action={signOutAction} className="pt-1">
            <SignOutButton />
          </form>
        </div>
      )}
    </div>
  );
}
