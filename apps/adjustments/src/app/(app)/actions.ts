"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApprovalError } from "@kit/services/approvals";
import { requireRole } from "@kit/services/authz";
import { AdjustmentError } from "@/lib/adjustments/policy";
import { getAdjustments } from "@/lib/adjustments/runtime";
import { safePath, withParam } from "@/lib/format";

const EXPECTED = new Set([AdjustmentError.name, ApprovalError.name]);

/** Business-rule failures to show the user. Matched by name: the domain modules can be bundled twice (relative `.ts` and `@/` imports). */
const isBusinessRuleError = (error: unknown): error is Error =>
  error instanceof AdjustmentError || error instanceof ApprovalError || (error instanceof Error && EXPECTED.has(error.name));

const field = (form: FormData, name: string) => String(form.get(name) ?? "");

/** Runs a mutation and sends the user back with a notice, or with the error for expected business-rule failures. */
async function run(form: FormData, notice: string, action: () => Promise<unknown>) {
  const returnTo = safePath(form.get("returnTo"));
  try {
    await action();
  } catch (error) {
    if (!isBusinessRuleError(error)) throw error;
    redirect(withParam(returnTo, "error", error.message));
  }
  revalidatePath("/", "layout");
  redirect(withParam(returnTo, "notice", notice));
}

export async function submitAdjustment(form: FormData) {
  const actor = await requireRole("Ledger.Operator");
  const { service } = await getAdjustments();
  await run(form, "Adjustment submitted for approval", () =>
    service.submit(actor, {
      accountId: field(form, "accountId"),
      direction: field(form, "direction"),
      amount: field(form, "amount"),
      reasonCode: field(form, "reasonCode"),
      memo: field(form, "memo"),
    }),
  );
}

export async function decideAdjustment(form: FormData) {
  const actor = await requireRole("Ledger.Approver");
  const { service } = await getAdjustments();
  const decision = field(form, "decision") === "approved" ? "approved" : "rejected";
  await run(form, decision === "approved" ? "Adjustment approved and posted" : "Adjustment rejected", () =>
    service.decide(actor, field(form, "id"), decision, field(form, "comment")),
  );
}

export async function cancelAdjustment(form: FormData) {
  const actor = await requireRole("Ledger.Operator");
  const { service } = await getAdjustments();
  await run(form, "Adjustment cancelled", () => service.cancel(actor, field(form, "id")));
}
