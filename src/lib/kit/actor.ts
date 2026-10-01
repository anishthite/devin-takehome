import type { Role } from "../roles.ts";

/** The signed-in user as seen by kit services, with roles resolved by the active RoleProvider. */
export interface Actor {
  /** Entra object id (`oid`). */
  id: string;
  name: string;
  roles: Role[];
}
