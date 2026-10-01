import { forbidden, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@kit/auth";
import { hasRole, type Role } from "@kit/auth/roles";
import type { Actor } from "./actor";
import { getKitServices } from "./services";

/** The signed-in user with roles from the active RoleProvider (Entra claims or Dataverse). */
export const currentActor = cache(async (): Promise<Actor> => {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const { id, sessionId, roles, name, email } = session.user;
  const services = await getKitServices();
  return { id, name: name ?? email ?? id, roles: await services.roles.getRoles({ id, sessionId, roles }) };
});

/** Renders the 403 page unless the signed-in user holds `required` (or a higher role). */
export async function requireRole(required: Role): Promise<Actor> {
  const actor = await currentActor();
  if (!hasRole(actor.roles, required)) forbidden();
  return actor;
}
