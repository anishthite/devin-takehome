import { hasRole } from "../../../../../packages/kit/auth/roles.ts";
import { APPROVAL_TARGET_TYPE } from "../../../../../packages/kit/services/approvals.ts";
import type { Actor } from "../../../../../packages/kit/services/actor.ts";
import type { ApprovalDecision, ApprovalService } from "../../../../../packages/kit/services/approvals.ts";
import type { AuditLog, AuditLogEntry, AuditTarget } from "../../../../../packages/kit/services/audit-log.ts";
import { PAYMENT_METHODS, REFUND_REASONS, type NewRefund, type Refund, type RefundStore } from "./types.ts";

/** Approving a refund above this amount needs `Ledger.Admin`; approvers can still reject it. */
export const ADMIN_APPROVAL_THRESHOLD_MINOR = 2_500_00;
export const MAX_REFUND_MINOR = 50_000_00;

export const REFUND_TARGET_TYPE = "refund";
export const AUDIT_EXPORT_TARGET_TYPE = "refund_audit_export";

export function refundTarget(id: string): AuditTarget {
  return { type: REFUND_TARGET_TYPE, id };
}

export class RefundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefundError";
  }
}

export interface RefundService {
  list(): Promise<Refund[]>;
  get(id: string): Promise<Refund | null>;
  request(actor: Actor, input: NewRefund): Promise<Refund>;
  decide(actor: Actor, id: string, decision: ApprovalDecision, comment?: string): Promise<Refund>;
  cancel(actor: Actor, id: string): Promise<Refund>;
  issue(actor: Actor, id: string): Promise<Refund>;
  /** Kit audit_log entries for the refund and its approval request, newest first. */
  auditTrail(refund: Refund): Promise<AuditLogEntry[]>;
  /** All kit audit_log entries that belong to refunds, newest first. */
  activity(): Promise<AuditLogEntry[]>;
  /** Records that `actor` exported `rows` audit entries. */
  recordExport(actor: Actor, rows: number): Promise<void>;
}

export interface RefundServiceDeps {
  store: RefundStore;
  approvals: ApprovalService;
  auditLog: AuditLog;
  now?: () => Date;
  newId?: () => string;
  newProviderRef?: () => string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OPEN_STATUSES = new Set<Refund["status"]>(["pending_approval", "approved"]);

export const needsAdminApproval = (refund: Pick<Refund, "amountMinor">) =>
  refund.amountMinor > ADMIN_APPROVAL_THRESHOLD_MINOR;

/** Whether `actor` may approve `refund` (ignoring its status). */
export function canApprove(actor: Actor, refund: Refund): boolean {
  if (refund.requestedById === actor.id) return false;
  return hasRole(actor.roles, needsAdminApproval(refund) ? "Ledger.Admin" : "Ledger.Approver");
}

const randomRef = () => `re_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
const randomId = () => `rf_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;

export function createRefundService({
  store,
  approvals,
  auditLog,
  now = () => new Date(),
  newId = randomId,
  newProviderRef = randomRef,
}: RefundServiceDeps): RefundService {
  async function load(id: string): Promise<Refund> {
    const refund = await store.get(id);
    if (!refund) throw new RefundError("Refund not found");
    return refund;
  }

  function approvalIdOf(refund: Refund): string {
    if (!refund.approvalId) throw new RefundError("Sample refunds are read-only");
    return refund.approvalId;
  }

  return {
    async list() {
      return (await store.list()).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    },

    get: (id) => store.get(id),

    async request(actor, input) {
      if (!hasRole(actor.roles, "Ledger.Operator")) throw new RefundError("Only operators can request refunds");
      const orderId = input.orderId.trim().toUpperCase();
      const customerName = input.customerName.trim();
      const customerEmail = input.customerEmail.trim().toLowerCase();
      const note = input.note.trim() || null;
      if (!orderId || !customerName) throw new RefundError("Order ID and customer name are required");
      if (!EMAIL.test(customerEmail)) throw new RefundError("Enter a valid customer email");
      if (!REFUND_REASONS.includes(input.reason)) throw new RefundError("Pick a refund reason");
      if (!PAYMENT_METHODS.includes(input.paymentMethod)) throw new RefundError("Pick the original payment method");
      if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
        throw new RefundError("Amount must be greater than zero");
      }
      if (input.amountMinor > MAX_REFUND_MINOR) throw new RefundError("Refunds over $50,000.00 must go through finance");

      const open = (await store.list()).find((r) => r.orderId === orderId && OPEN_STATUSES.has(r.status));
      if (open) throw new RefundError(`Order ${orderId} already has an open refund (${open.id})`);

      const approval = await approvals.submit(actor, {
        title: `Refund ${orderId}`,
        counterparty: customerName,
        amountMinor: input.amountMinor,
      });

      const refund: Refund = {
        id: newId(),
        orderId,
        customerName,
        customerEmail,
        paymentMethod: input.paymentMethod,
        reason: input.reason,
        note,
        amountMinor: input.amountMinor,
        currency: "USD",
        status: "pending_approval",
        requestedById: actor.id,
        requestedByName: actor.name,
        requestedAt: approval.requestedAt,
        decidedByName: null,
        decidedAt: null,
        decisionComment: null,
        issuedByName: null,
        issuedAt: null,
        providerRef: null,
        approvalId: approval.id,
        sample: false,
      };
      await store.save(refund);
      await auditLog.append({
        actorId: actor.id,
        actorName: actor.name,
        action: "Refund requested",
        target: refundTarget(refund.id),
        changes: [
          { attribute: "orderId", oldValue: null, newValue: orderId },
          { attribute: "customer", oldValue: null, newValue: `${customerName} <${customerEmail}>` },
          { attribute: "paymentMethod", oldValue: null, newValue: input.paymentMethod },
          { attribute: "reason", oldValue: null, newValue: input.reason },
          { attribute: "amountMinor", oldValue: null, newValue: input.amountMinor },
          ...(note ? [{ attribute: "note", oldValue: null, newValue: note }] : []),
          { attribute: "approvalId", oldValue: null, newValue: approval.id },
        ],
      });
      return refund;
    },

    async decide(actor, id, decision, comment) {
      const refund = await load(id);
      if (refund.status !== "pending_approval") throw new RefundError(`Refund is already ${refund.status}`);
      if (decision === "approved" && needsAdminApproval(refund) && !hasRole(actor.roles, "Ledger.Admin")) {
        throw new RefundError("Refunds over $2,500.00 need an Admin to approve");
      }
      const approval = await approvals.decide(actor, approvalIdOf(refund), decision, comment);
      Object.assign(refund, {
        status: decision,
        decidedByName: approval.decidedByName,
        decidedAt: approval.decidedAt,
        decisionComment: approval.comment,
      });
      await store.save(refund);
      return refund;
    },

    async cancel(actor, id) {
      const refund = await load(id);
      await approvals.cancel(actor, approvalIdOf(refund));
      refund.status = "cancelled";
      await store.save(refund);
      return refund;
    },

    async issue(actor, id) {
      if (!hasRole(actor.roles, "Ledger.Operator")) throw new RefundError("Only operators can issue refunds");
      const refund = await load(id);
      approvalIdOf(refund);
      if (refund.status !== "approved") throw new RefundError("Only approved refunds can be issued");
      const providerRef = newProviderRef();
      Object.assign(refund, {
        status: "issued",
        issuedByName: actor.name,
        issuedAt: now().toISOString(),
        providerRef,
      });
      await store.save(refund);
      await auditLog.append({
        actorId: actor.id,
        actorName: actor.name,
        action: "Refund issued",
        target: refundTarget(refund.id),
        changes: [
          { attribute: "status", oldValue: "approved", newValue: "issued" },
          { attribute: "providerRef", oldValue: null, newValue: providerRef },
        ],
      });
      return refund;
    },

    async auditTrail(refund) {
      return (await auditLog.list()).filter(
        (e) =>
          (e.target.type === REFUND_TARGET_TYPE && e.target.id === refund.id) ||
          (e.target.type === APPROVAL_TARGET_TYPE && e.target.id === refund.approvalId),
      );
    },

    async activity() {
      const approvalIds = new Set((await store.list()).flatMap((r) => (r.approvalId ? [r.approvalId] : [])));
      return (await auditLog.list()).filter(
        (e) =>
          e.target.type === REFUND_TARGET_TYPE ||
          e.target.type === AUDIT_EXPORT_TARGET_TYPE ||
          (e.target.type === APPROVAL_TARGET_TYPE && approvalIds.has(e.target.id)),
      );
    },

    async recordExport(actor, rows) {
      if (!hasRole(actor.roles, "Ledger.Admin")) throw new RefundError("Only admins can export the audit log");
      const at = now().toISOString();
      await auditLog.append({
        actorId: actor.id,
        actorName: actor.name,
        action: "Audit log exported",
        target: { type: AUDIT_EXPORT_TARGET_TYPE, id: at },
        changes: [{ attribute: "rows", oldValue: null, newValue: rows }],
      });
    },
  };
}
