"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/kit/authz";
import { ApprovalError } from "@/lib/kit/approvals";
import { getKitServices } from "@/lib/kit/services";

const field = (form: FormData, name: string) => String(form.get(name) ?? "");

function parseAmountMinor(value: string): number {
  const match = /^\s*(\d{1,12})(?:\.(\d{1,2}))?\s*$/.exec(value.replaceAll(",", ""));
  if (!match) throw new ApprovalError("Enter an amount like 1250.00");
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

async function run(action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error) {
    if (!(error instanceof ApprovalError)) throw error;
    redirect(`/approvals?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/approvals");
  revalidatePath("/audit");
  redirect("/approvals");
}

export async function submitApproval(form: FormData) {
  const actor = await requireRole("Ledger.Operator");
  const { approvals } = await getKitServices();
  await run(async () =>
    approvals.submit(actor, {
      title: field(form, "title"),
      counterparty: field(form, "counterparty"),
      amountMinor: parseAmountMinor(field(form, "amount")),
    }),
  );
}

export async function decideApproval(form: FormData) {
  const actor = await requireRole("Ledger.Approver");
  const { approvals } = await getKitServices();
  const decision = field(form, "decision") === "approved" ? "approved" : "rejected";
  await run(() => approvals.decide(actor, field(form, "id"), decision, field(form, "comment")));
}

export async function cancelApproval(form: FormData) {
  const actor = await requireRole("Ledger.Operator");
  const { approvals } = await getKitServices();
  await run(() => approvals.cancel(actor, field(form, "id")));
}
