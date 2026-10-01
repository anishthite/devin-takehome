import { DEMO_PERSONAS } from "@kit/demo/personas";
import { isDemoMode } from "@kit/demo/mode";
import type { Actor } from "@kit/services/actor";
import { getKitServices } from "@kit/services/services";
import { sampleRefunds } from "./sample-data";
import { createRefundService, type RefundService } from "./service";
import { memoryRefundStore } from "./store";

async function seedDemoRefunds(refunds: RefundService) {
  const [admin, approver, operator] = DEMO_PERSONAS;
  const as = (persona: (typeof DEMO_PERSONAS)[number]): Actor => ({
    id: persona.id,
    name: persona.name,
    roles: [persona.role],
  });
  const sam = as(operator);
  const customer = { paymentMethod: "Visa", note: "" } as const;

  const approved = await refunds.request(sam, {
    ...customer,
    orderId: "ORD-50112",
    customerName: "Harper Wells",
    customerEmail: "harper@example.com",
    reason: "damaged",
    amountMinor: 189_00,
    note: "Photos of the cracked casing attached to ticket #8812.",
  });
  await refunds.decide(as(approver), approved.id, "approved", "Photos confirm the damage.");

  await refunds.request(sam, {
    ...customer,
    orderId: "ORD-50131",
    customerName: "Mason Reid",
    customerEmail: "mason@example.com",
    paymentMethod: "PayPal",
    reason: "not_received",
    amountMinor: 74_50,
    note: "Carrier shows delivered; customer says no package.",
  });
  await refunds.request(sam, {
    ...customer,
    orderId: "ORD-50147",
    customerName: "Nora Lindqvist",
    customerEmail: "nora@example.com",
    paymentMethod: "Amex",
    reason: "service_issue",
    amountMinor: 3_480_00,
    note: "Annual plan cancelled after a week-long outage.",
  });
  const issued = await refunds.request(sam, {
    ...customer,
    orderId: "ORD-50098",
    customerName: "Elijah Moore",
    customerEmail: "elijah@example.com",
    reason: "duplicate_charge",
    amountMinor: 129_99,
  });
  await refunds.decide(as(admin), issued.id, "approved");
  await refunds.issue(sam, issued.id);
}

async function build(): Promise<RefundService> {
  const { approvals, auditLog } = await getKitServices();
  const refunds = createRefundService({ store: memoryRefundStore(sampleRefunds(new Date())), approvals, auditLog });
  if (isDemoMode()) await seedDemoRefunds(refunds);
  return refunds;
}

const holder = globalThis as typeof globalThis & { __refundService?: Promise<RefundService> };

/** Process-wide refund service on top of the kit's approvals and audit_log. */
export function getRefunds(): Promise<RefundService> {
  holder.__refundService ??= build().catch((error: unknown) => {
    holder.__refundService = undefined;
    throw error;
  });
  return holder.__refundService;
}
