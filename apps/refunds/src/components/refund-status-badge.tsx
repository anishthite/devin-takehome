import { Badge } from "@kit/ui/badge";
import { STATUS_LABELS, type RefundStatus } from "@/lib/refunds/types";

const VARIANTS: Record<RefundStatus, "warning" | "info" | "success" | "danger" | "secondary"> = {
  pending_approval: "warning",
  approved: "info",
  issued: "success",
  rejected: "danger",
  cancelled: "secondary",
};

export function RefundStatusBadge({ status }: { status: RefundStatus }) {
  return (
    <Badge variant={VARIANTS[status]} className="gap-1.5">
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
