import type { Role } from "../lib/roles.ts";

export interface DemoPersona {
  /** Mock Entra object id (`oid`). */
  id: string;
  name: string;
  email: string;
  role: Role;
  blurb: string;
}

export const DEMO_PERSONAS: readonly DemoPersona[] = [
  {
    id: "a1d3c0de-0000-4000-8000-000000000001",
    name: "Avery Admin",
    email: "avery@demo.ledger",
    role: "Ledger.Admin",
    blurb: "Full access, settings and audit log",
  },
  {
    id: "a1d3c0de-0000-4000-8000-000000000002",
    name: "Jordan Approver",
    email: "jordan@demo.ledger",
    role: "Ledger.Approver",
    blurb: "Approves and rejects payments",
  },
  {
    id: "a1d3c0de-0000-4000-8000-000000000003",
    name: "Sam Operator",
    email: "sam@demo.ledger",
    role: "Ledger.Operator",
    blurb: "Creates draft payments",
  },
  {
    id: "a1d3c0de-0000-4000-8000-000000000004",
    name: "Riley Viewer",
    email: "riley@demo.ledger",
    role: "Ledger.Viewer",
    blurb: "Read-only access",
  },
];

export function findPersona(id: unknown): DemoPersona | undefined {
  return DEMO_PERSONAS.find((persona) => persona.id === id);
}

export function findPersonaByEmail(email: unknown): DemoPersona | undefined {
  if (typeof email !== "string") return undefined;
  return DEMO_PERSONAS.find((persona) => persona.email === email.toLowerCase());
}
