import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/ui-components/badge"

type PaymentStatus = "posted" | "pending" | "failed" | "refunded" | "draft"

const STATUS: Record<
  PaymentStatus,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "secondary" }
> = {
  posted: { label: "Posted", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  failed: { label: "Failed", variant: "danger" },
  refunded: { label: "Refunded", variant: "info" },
  draft: { label: "Draft", variant: "secondary" },
}

type StatusBadgeProps = Omit<React.ComponentProps<typeof Badge>, "variant" | "children"> & {
  status: PaymentStatus
}

function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const { label, variant } = STATUS[status]
  return (
    <Badge data-status={status} variant={variant} className={cn("gap-1.5", className)} {...props}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  )
}

export { StatusBadge, type PaymentStatus }
