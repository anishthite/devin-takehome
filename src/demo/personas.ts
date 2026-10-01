import type { Role } from "@/lib/roles";

export interface DemoPersona {
  id: string;
  name: string;
  email: string;
  role: Role;
  blurb: string;
}

export const DEMO_PERSONAS: readonly DemoPersona[] = [
  {
    id: "demo-admin-0001",
    name: "Avery Admin",
    email: "avery@demo.ledger",
    role: "Ledger.Admin",
    blurb: "Full access, settings and audit log",
  },
  {
    id: "demo-approver-0002",
    name: "Jordan Approver",
    email: "jordan@demo.ledger",
    role: "Ledger.Approver",
    blurb: "Approves and rejects payments",
  },
  {
    id: "demo-operator-0003",
    name: "Sam Operator",
    email: "sam@demo.ledger",
    role: "Ledger.Operator",
    blurb: "Creates draft payments",
  },
  {
    id: "demo-viewer-0004",
    name: "Riley Viewer",
    email: "riley@demo.ledger",
    role: "Ledger.Viewer",
    blurb: "Read-only access",
  },
];

export function findPersona(id: unknown): DemoPersona | undefined {
  return DEMO_PERSONAS.find((persona) => persona.id === id);
}
