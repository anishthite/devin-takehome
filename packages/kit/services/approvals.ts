import { hasRole } from "../auth/roles.ts";
import type { Guid } from "../dataverse/types.ts";
import type { Actor } from "./actor.ts";
import type { AuditChange, AuditLog, AuditTarget } from "./audit-log.ts";

/**
 * Maker-checker approvals. The kit's store is the source of truth: an Operator submits,
 * a different Approver decides. Dataverse only ever receives a mirror of the status.
 */

export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";
export type ApprovalDecision = "approved" | "rejected";

/** App-specific fields carried with a request (e.g. the account an adjustment applies to). */
export type ApprovalDetails = Record<string, string | number | boolean | null>;

/** Payments are the default kind; other apps register their own (e.g. `balance_adjustment`). */
export const PAYMENT_KIND = "payment";

export interface ApprovalRequest {
  id: string;
  kind: string;
  title: string;
  counterparty: string;
  amountMinor: number;
  currency: "USD";
  status: ApprovalStatus;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  decidedById: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  comment: string | null;
  /** Row in the Dataverse mirror table, once mirrored. */
  mirror: { entitySet: string; id: Guid } | null;
  /** Last mirror failure; the kit record stays authoritative either way. */
  mirrorError: string | null;
  details: ApprovalDetails;
}

export interface NewApprovalRequest {
  title: string;
  counterparty: string;
  amountMinor: number;
  kind?: string;
  details?: ApprovalDetails;
}

export interface ApprovalFilter {
  kind?: string;
}

export interface ApprovalStore {
  list(filter?: ApprovalFilter): Promise<ApprovalRequest[]>;
  get(id: string): Promise<ApprovalRequest | null>;
  save(request: ApprovalRequest): Promise<void>;
}

/** Optional one-way copy of request status into an app-owned Dataverse table. */
export interface ApprovalStatusMirror {
  readonly entitySet: string;
  /** Creates the mirror row (when `request.mirror` is null) or updates it, as `actor`. Returns the row id. */
  publish(request: ApprovalRequest, actor: Actor): Promise<Guid>;
}

export class ApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApprovalError";
  }
}

export interface DecideOptions {
  /** Kind the caller knows how to decide; defaults to payments. Other kinds are refused. */
  kind?: string;
  /**
   * Runs on approval, inside the same transaction and before the request is saved as approved,
   * e.g. to post the money movement. If it throws, the request stays pending.
   */
  onApproved?: (request: ApprovalRequest, actor: Actor) => Promise<void>;
}

export interface ApprovalService {
  list(filter?: ApprovalFilter): Promise<ApprovalRequest[]>;
  get(id: string): Promise<ApprovalRequest | null>;
  submit(actor: Actor, input: NewApprovalRequest): Promise<ApprovalRequest>;
  decide(
    actor: Actor,
    id: string,
    decision: ApprovalDecision,
    comment?: string,
    options?: DecideOptions,
  ): Promise<ApprovalRequest>;
  cancel(actor: Actor, id: string): Promise<ApprovalRequest>;
}

export type Transaction = <T>(fn: () => Promise<T>) => Promise<T>;

export interface ApprovalServiceDeps {
  store: ApprovalStore;
  auditLog: AuditLog;
  mirror: ApprovalStatusMirror | null;
  /** Wraps each state change (effect + save + audit) so they commit together; SQL-backed stores pass `sql.transaction`. */
  transaction?: Transaction;
  now?: () => Date;
  newId?: () => string;
}

export const APPROVAL_TARGET_TYPE = "approval_request";

export function approvalTarget(id: string): AuditTarget {
  return { type: APPROVAL_TARGET_TYPE, id };
}

export function createApprovalService({
  store,
  auditLog,
  mirror,
  transaction = (fn) => fn(),
  now = () => new Date(),
  newId = () => crypto.randomUUID(),
}: ApprovalServiceDeps): ApprovalService {
  async function load(id: string): Promise<ApprovalRequest> {
    const request = await store.get(id);
    if (!request) throw new ApprovalError("Approval request not found");
    return request;
  }

  async function record(
    actor: Actor,
    action: string,
    request: ApprovalRequest,
    changes: AuditChange[],
    effect?: () => Promise<void>,
  ) {
    await transaction(async () => {
      if (effect) await effect();
      await store.save(request);
      await auditLog.append({ actorId: actor.id, actorName: actor.name, action, target: approvalTarget(request.id), changes });
    });
    if (!mirror) return request;
    try {
      const id = await mirror.publish(request, actor);
      request.mirror = { entitySet: mirror.entitySet, id };
      request.mirrorError = null;
    } catch (error) {
      request.mirrorError = error instanceof Error ? error.message : String(error);
    }
    await store.save(request);
    return request;
  }

  const statusChange = (from: ApprovalStatus, to: ApprovalStatus): AuditChange => ({
    attribute: "status",
    oldValue: from,
    newValue: to,
  });

  return {
    async list(filter) {
      return (await store.list(filter)).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    },

    get: (id) => store.get(id),

    async submit(actor, input) {
      if (!hasRole(actor.roles, "Ledger.Operator")) throw new ApprovalError("Only operators can submit payments for approval");
      const title = input.title.trim();
      const counterparty = input.counterparty.trim();
      if (!title || !counterparty) throw new ApprovalError("Title and counterparty are required");
      if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
        throw new ApprovalError("Amount must be a positive number of cents");
      }

      const kind = input.kind ?? PAYMENT_KIND;
      const request: ApprovalRequest = {
        id: newId(),
        kind,
        title,
        counterparty,
        amountMinor: input.amountMinor,
        currency: "USD",
        status: "pending",
        requestedById: actor.id,
        requestedByName: actor.name,
        requestedAt: now().toISOString(),
        decidedById: null,
        decidedByName: null,
        decidedAt: null,
        comment: null,
        mirror: null,
        mirrorError: null,
        details: { ...input.details },
      };
      return record(actor, "Submitted", request, [
        { attribute: "title", oldValue: null, newValue: title },
        { attribute: "counterparty", oldValue: null, newValue: counterparty },
        { attribute: "amountMinor", oldValue: null, newValue: input.amountMinor },
        { attribute: "status", oldValue: null, newValue: "pending" },
      ]);
    },

    async decide(actor, id, decision, comment, options = {}) {
      if (!hasRole(actor.roles, "Ledger.Approver")) throw new ApprovalError("Only approvers can decide approval requests");
      const request = await load(id);
      if (request.kind !== (options.kind ?? PAYMENT_KIND)) {
        throw new ApprovalError("This request has to be decided in the app that owns it");
      }
      if (request.status !== "pending") throw new ApprovalError(`Request is already ${request.status}`);
      if (request.requestedById === actor.id) throw new ApprovalError("You can't decide a request you submitted");

      const note = comment?.trim() || null;
      Object.assign(request, {
        status: decision,
        decidedById: actor.id,
        decidedByName: actor.name,
        decidedAt: now().toISOString(),
        comment: note,
      });
      const changes = [statusChange("pending", decision)];
      if (note) changes.push({ attribute: "comment", oldValue: null, newValue: note });
      const onApproved = decision === "approved" ? options.onApproved : undefined;
      return record(
        actor,
        decision === "approved" ? "Approved" : "Rejected",
        request,
        changes,
        onApproved && (() => onApproved(structuredClone(request), actor)),
      );
    },

    async cancel(actor, id) {
      const request = await load(id);
      if (request.requestedById !== actor.id) throw new ApprovalError("Only the requester can cancel a request");
      if (request.status !== "pending") throw new ApprovalError(`Request is already ${request.status}`);
      request.status = "cancelled";
      return record(actor, "Cancelled", request, [statusChange("pending", "cancelled")]);
    },
  };
}
