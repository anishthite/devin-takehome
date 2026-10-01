import { hasRole } from "../../../../../packages/kit/auth/roles.ts";
import type { Actor } from "../../../../../packages/kit/services/actor.ts";
import type {
  ApprovalDecision,
  ApprovalRequest,
  ApprovalService,
  Transaction,
} from "../../../../../packages/kit/services/approvals.ts";
import { withAudit, type AuditLog } from "../../../../../packages/kit/services/audit-log.ts";
import type { CustomerAccounts } from "./accounts.ts";
import {
  ACCOUNT_TARGET_TYPE,
  ADJUSTMENT_KIND,
  ADMIN_APPROVAL_THRESHOLD_MINOR,
  AdjustmentError,
  assertPostable,
  canApprove,
  reasonLabel,
  signed,
  validateAdjustment,
  type AdjustmentInput,
} from "./policy.ts";
import type { AdjustmentRequest, Direction } from "./types.ts";

const formatUsd = (minor: number) => (minor / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export interface AdjustmentServiceDeps {
  accounts: CustomerAccounts;
  approvals: ApprovalService;
  auditLog: AuditLog;
  /** The SQL client's transaction, so the posting, its audit entry and the approval commit together. */
  transaction: Transaction;
}

export function toAdjustmentRequest(r: ApprovalRequest): AdjustmentRequest {
  const d = r.details;
  const direction = d.direction as Direction;
  return {
    id: r.id,
    status: r.status,
    accountId: String(d.accountId),
    accountNumber: String(d.accountNumber),
    customerName: r.counterparty,
    direction,
    amountMinor: r.amountMinor,
    signedAmountMinor: signed(direction, r.amountMinor),
    reasonCode: String(d.reasonCode),
    memo: String(d.memo),
    balanceAtRequestMinor: Number(d.balanceAtRequestMinor),
    requestedById: r.requestedById,
    requestedByName: r.requestedByName,
    requestedAt: r.requestedAt,
    decidedByName: r.decidedByName,
    decidedAt: r.decidedAt,
    comment: r.comment,
  };
}

export type AdjustmentService = ReturnType<typeof createAdjustmentService>;

export function createAdjustmentService({ accounts, approvals, auditLog, transaction }: AdjustmentServiceDeps) {
  async function load(id: string): Promise<AdjustmentRequest> {
    const request = await approvals.get(id);
    if (!request || request.kind !== ADJUSTMENT_KIND) throw new AdjustmentError("Adjustment request not found");
    return toAdjustmentRequest(request);
  }

  async function listRequests(filter: { accountId?: string } = {}): Promise<AdjustmentRequest[]> {
    const all = (await approvals.list({ kind: ADJUSTMENT_KIND })).map(toAdjustmentRequest);
    return filter.accountId ? all.filter((r) => r.accountId === filter.accountId) : all;
  }

  return {
    accounts,
    listRequests,
    get: load,

    /** Maker: records a pending request. No money moves until a different user approves it. */
    async submit(actor: Actor, input: AdjustmentInput): Promise<AdjustmentRequest> {
      if (!hasRole(actor.roles, "Ledger.Operator")) throw new AdjustmentError("Only operators can request adjustments");
      const valid = validateAdjustment(input);
      const account = await accounts.get(valid.accountId);
      if (!account) throw new AdjustmentError("Customer account not found");
      const amount = signed(valid.direction, valid.amountMinor);
      assertPostable(account, amount);

      const pending = (await listRequests({ accountId: account.id })).filter((r) => r.status === "pending");
      if (pending.some((r) => r.signedAmountMinor === amount && r.reasonCode === valid.reasonCode)) {
        throw new AdjustmentError("An identical adjustment is already pending for this account");
      }

      const request = await withAudit(
        auditLog,
        actor,
        {
          action: "Adjustment requested",
          target: { type: ACCOUNT_TARGET_TYPE, id: account.id },
          changes: (r) => [
            { attribute: "approvalId", oldValue: null, newValue: r.id },
            { attribute: "amountMinor", oldValue: null, newValue: amount },
            { attribute: "reasonCode", oldValue: null, newValue: valid.reasonCode },
          ],
        },
        () =>
          approvals.submit(actor, {
            kind: ADJUSTMENT_KIND,
            title: reasonLabel(valid.reasonCode),
            counterparty: account.name,
            amountMinor: valid.amountMinor,
            details: {
              accountId: account.id,
              accountNumber: account.accountNumber,
              direction: valid.direction,
              reasonCode: valid.reasonCode,
              memo: valid.memo,
              balanceAtRequestMinor: account.balanceMinor,
            },
          }),
        transaction,
      );
      return toAdjustmentRequest(request);
    },

    /** Checker: approving posts the adjustment in the same transaction; rejecting moves no money. */
    async decide(actor: Actor, id: string, decision: ApprovalDecision, comment?: string): Promise<AdjustmentRequest> {
      const request = await load(id);
      if (decision === "approved" && hasRole(actor.roles, "Ledger.Approver") && !canApprove(actor.roles, request.amountMinor)) {
        throw new AdjustmentError(`Adjustments over ${formatUsd(ADMIN_APPROVAL_THRESHOLD_MINOR)} need an Admin to approve`);
      }
      const decided = await approvals.decide(actor, id, decision, comment, {
        kind: ADJUSTMENT_KIND,
        onApproved: async (approved, checker) => {
          const r = toAdjustmentRequest(approved);
          await withAudit(
            auditLog,
            checker,
            {
              action: "Balance adjusted",
              target: { type: ACCOUNT_TARGET_TYPE, id: r.accountId },
              changes: ({ adjustment }) => [
                { attribute: "balanceMinor", oldValue: adjustment.balanceBeforeMinor, newValue: adjustment.balanceAfterMinor },
                { attribute: "approvalId", oldValue: null, newValue: r.id },
                { attribute: "requestedBy", oldValue: null, newValue: r.requestedByName },
              ],
            },
            () =>
              accounts.post({
                accountId: r.accountId,
                approvalId: r.id,
                direction: r.direction,
                signedAmountMinor: r.signedAmountMinor,
                reasonCode: r.reasonCode,
                memo: r.memo,
                requestedBy: { id: r.requestedById, name: r.requestedByName },
                approvedBy: { id: checker.id, name: checker.name },
              }),
            transaction,
          );
        },
      });
      return toAdjustmentRequest(decided);
    },

    async cancel(actor: Actor, id: string): Promise<AdjustmentRequest> {
      await load(id);
      return toAdjustmentRequest(await approvals.cancel(actor, id));
    },
  };
}
