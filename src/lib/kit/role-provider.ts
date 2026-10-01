import type { Role } from "../roles.ts";

export interface RoleSubject {
  /** Entra object id (`oid`). */
  id: string;
  /** Per-sign-in id from the session; scopes the role cache. */
  sessionId: string;
  /** App roles from the Entra token. */
  roles: Role[];
}

export interface RoleProvider {
  getRoles(user: RoleSubject): Promise<Role[]>;
}

/** Default: trust the Entra app-role claims already in the session. */
export const claimsRoleProvider: RoleProvider = {
  async getRoles(user) {
    return user.roles;
  },
};

/** Resolves roles once per session (until `ttlMs` elapses); failures are not cached. */
export function cachePerSession(
  provider: RoleProvider,
  ttlMs: number,
  now: () => number = Date.now,
): RoleProvider {
  const cache = new Map<string, { roles: Promise<Role[]>; expiresAt: number }>();

  return {
    getRoles(user) {
      const key = user.sessionId || user.id;
      const time = now();
      const hit = cache.get(key);
      if (hit && hit.expiresAt > time) return hit.roles;

      for (const [k, entry] of cache) if (entry.expiresAt <= time) cache.delete(k);

      const roles = provider.getRoles(user);
      cache.set(key, { roles, expiresAt: time + ttlMs });
      roles.catch(() => {
        if (cache.get(key)?.roles === roles) cache.delete(key);
      });
      return roles;
    },
  };
}
