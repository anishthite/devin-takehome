"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApprovalError } from "@kit/services/approvals";
import { requireRole } from "@kit/services/authz";
import { parseAmountMinor } from "@/lib/refunds/format";
import { getRefunds } from "@/lib/refunds/server";
import { RefundError } from "@/lib/refunds/service";
import type { PaymentMethod, RefundReason } from "@/lib/refunds/types";

const field = (form: FormData, name: string) => String(form.get(name) ?? "");

/** Runs a refund mutation, sending domain errors back to `errorPath` and success to `donePath`. */
async function run(errorPath: string, action: () => Promise<{ id: string }>) {
  let id: string;
  try {
    ({ id } = await action());
  } catch (error) {
    if (!(error instanceof RefundError || error instanceof ApprovalError)) throw error;
    redirect(`${errorPath}${errorPath.includes("?") ? "&" : "?"}error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/", "layout");
  redirect(`/refunds/${id}`);
}

export async function requestRefund(form: FormData) {
  const actor = await requireRole("Ledger.Operator");
  const refunds = await getRefunds();
  await run("/refunds/new", async () => {
    const amountMinor = parseAmountMinor(field(form, "amount"));
    if (amountMinor === null) throw new RefundError("Enter an amount like 129.99");
    return refunds.request(actor, {
      orderId: field(form, "orderId"),
      customerName: field(form, "customerName"),
      customerEmail: field(form, "customerEmail"),
      paymentMethod: field(form, "paymentMethod") as PaymentMethod,
      reason: field(form, "reason") as RefundReason,
      note: field(form, "note"),
      amountMinor,
    });
  });
}

export async function decideRefund(form: FormData) {
  const actor = await requireRole("Ledger.Approver");
  const refunds = await getRefunds();
  const id = field(form, "id");
  const decision = field(form, "decision") === "approved" ? "approved" : "rejected";
  await run(`/refunds/${id}`, () => refunds.decide(actor, id, decision, field(form, "comment")));
}

export async function cancelRefund(form: FormData) {
  const actor = await requireRole("Ledger.Operator");
  const refunds = await getRefunds();
  const id = field(form, "id");
  await run(`/refunds/${id}`, () => refunds.cancel(actor, id));
}

export async function issueRefund(form: FormData) {
  const actor = await requireRole("Ledger.Operator");
  const refunds = await getRefunds();
  const id = field(form, "id");
  await run(`/refunds/${id}`, () => refunds.issue(actor, id));
}
