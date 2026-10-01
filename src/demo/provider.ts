import Credentials from "next-auth/providers/credentials";
import { findPersona } from "./personas";

export const DEMO_PROVIDER_ID = "demo";

export function DemoProvider() {
  return Credentials({
    id: DEMO_PROVIDER_ID,
    name: "Demo persona",
    credentials: { personaId: {} },
    authorize(credentials) {
      const persona = findPersona(credentials?.personaId);
      if (!persona) return null;
      return { id: persona.id, name: persona.name, email: persona.email };
    },
  });
}
