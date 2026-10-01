import type { Session } from "next-auth";
import { signOut } from "@kit/auth";
import { ROLE_LABELS, highestRole } from "@kit/auth/roles";
import { UserMenuDropdown } from "./user-menu-dropdown";

export function UserMenu({ user }: { user: Session["user"] }) {
  const role = highestRole(user.roles);

  return (
    <UserMenuDropdown
      name={user.name ?? user.email ?? "Signed in"}
      email={user.email ?? undefined}
      roleLabel={role ? ROLE_LABELS[role] : undefined}
      signOutAction={async () => {
        "use server";
        await signOut({ redirectTo: "/signin?signedOut=1" });
      }}
    />
  );
}
