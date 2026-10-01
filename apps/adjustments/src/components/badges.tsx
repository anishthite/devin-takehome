import type { ApprovalStatus } from "@kit/services/approvals";
import { Badge } from "@kit/ui/badge";
import type { AccountStatus } from "@/lib/adjustments/types";

const ACCOUNT: Record<AccountStatus, "success" | "info" | "secondary"> = {
  active: "success",
  frozen: "info",
  closed: "secondary",
};

const REQUEST: Record<ApprovalStatus, "warning" | "success" | "danger" | "secondary"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "secondary",
};

const REQUEST_LABEL: Record<ApprovalStatus, string> = {
  pending: "Pending",
  approved: "Posted",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return (
    <Badge variant={ACCOUNT[status]} className="capitalize">
      {status}
    </Badge>
  );
}

export function RequestStatusBadge({ status }: { status: ApprovalStatus }) {
  return (
    <Badge variant={REQUEST[status]} className="gap-1.5">
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {REQUEST_LABEL[status]}
    </Badge>
  );
}
