"use client";

import { useFormStatus } from "react-dom";
import { ChevronsUpDown, Loader2, LogOut } from "lucide-react";
import { Avatar } from "./avatar";
import { Button } from "@/ui-components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui-components/dropdown-menu";

interface Props {
  name: string;
  email?: string;
  roleLabel?: string;
  signOutAction: () => Promise<void>;
}

function SignOutItem() {
  const { pending } = useFormStatus();
  return (
    <DropdownMenuItem asChild disabled={pending} onSelect={(event) => event.preventDefault()}>
      <button type="submit" className="w-full disabled:cursor-wait">
        {pending ? <Loader2 className="animate-spin" /> : <LogOut />}
        {pending ? "Signing out…" : "Sign out"}
      </button>
    </DropdownMenuItem>
  );
}

export function UserMenuDropdown({ name, email, roleLabel, signOutAction }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto gap-3 px-2 py-1.5">
          <Avatar name={name} />
          <span className="hidden text-left sm:block">
            <span className="block text-sm leading-tight font-medium">{name}</span>
            {roleLabel && (
              <span className="block text-xs font-normal text-muted-foreground">{roleLabel}</span>
            )}
          </span>
          <ChevronsUpDown className="hidden text-muted-foreground sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="truncate text-sm font-medium">{email ?? name}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <SignOutItem />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
