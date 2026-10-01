import * as React from "react"
import { cn } from "@/lib/utils"
import { Amount } from "@/ui-components/amount"
import { StatusBadge, type PaymentStatus } from "@/ui-components/status-badge"

function TransactionList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="transaction-list"
      className={cn("flex flex-col divide-y", className)}
      {...props}
    />
  )
}

function TransactionGroupLabel({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="transaction-group-label"
      className={cn(
        "pt-4 pb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

type TransactionRowProps = Omit<React.ComponentProps<"li">, "children"> & {
  merchant: string
  amount: number
  currency?: string
  category?: string
  date?: string
  icon?: React.ReactNode
  status?: PaymentStatus
  /** `amount` is in minor units (cents) */
  minor?: boolean
}

function TransactionRow({
  merchant,
  amount,
  currency,
  category,
  date,
  icon,
  status = "posted",
  minor,
  className,
  ...props
}: TransactionRowProps) {
  const meta = [category, date].filter(Boolean).join(" · ")

  return (
    <li
      data-slot="transaction-row"
      data-status={status}
      className={cn("flex items-center gap-3 py-3", className)}
      {...props}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground [&_svg]:size-4">
        {icon ?? merchant.charAt(0).toUpperCase()}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{merchant}</span>
        {meta && <span className="truncate text-xs text-muted-foreground">{meta}</span>}
      </div>
      <div className="flex flex-col items-end gap-1">
        <Amount
          value={amount}
          currency={currency}
          minor={minor}
          size="sm"
          signed
          tone={amount > 0 ? "auto" : "neutral"}
          className={cn(status === "failed" && "text-muted-foreground line-through")}
        />
        {status !== "posted" && <StatusBadge status={status} />}
      </div>
    </li>
  )
}

export { TransactionList, TransactionGroupLabel, TransactionRow }
