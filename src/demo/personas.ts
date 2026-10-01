import type { Role } from "@/lib/roles";

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
    id: "00000000-0000-4000-a000-000000000001",
    name: "Avery Admin",
    email: "avery@demo.ledger",
    role: "Ledger.Admin",
    blurb: "Full access, settings and audit log",
  },
  {
    id: "00000000-0000-4000-a000-000000000002",
    name: "Jordan Approver",
    email: "jordan@demo.ledger",
    role: "Ledger.Approver",
    blurb: "Approves and rejects payments",
  },
  {
    id: "00000000-0000-4000-a000-000000000003",
    name: "Sam Operator",
    email: "sam@demo.ledger",
    role: "Ledger.Operator",
    blurb: "Creates draft payments",
  },
  {
    id: "00000000-0000-4000-a000-000000000004",
    name: "Riley Viewer",
    email: "riley@demo.ledger",
    role: "Ledger.Viewer",
    blurb: "Read-only access",
  },
];

export function findPersona(id: unknown): DemoPersona | undefined {
  return DEMO_PERSONAS.find((persona) => persona.id === id);
}
