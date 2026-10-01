"use client"

import * as React from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Amount } from "@/ui-components/amount"
import { Button } from "@/ui-components/button"
import { Delta } from "@/ui-components/delta"
import { Sparkline } from "@/ui-components/sparkline"

type BalanceCardProps = Omit<React.ComponentProps<"div">, "children"> & {
  label: string
  balance: number
  currency?: string
  change?: number
  changeLabel?: string
  history?: number[]
  variant?: "default" | "ink"
  actions?: React.ReactNode
  defaultHidden?: boolean
}

function BalanceCard({
  label,
  balance,
  currency = "USD",
  change,
  changeLabel = "vs last month",
  history,
  variant = "default",
  actions,
  defaultHidden = false,
  className,
  ...props
}: BalanceCardProps) {
  const [hidden, setHidden] = React.useState(defaultHidden)
  const isInk = variant === "ink"

  return (
    <div
      data-slot="balance-card"
      data-variant={variant}
      className={cn(
        "relative flex flex-col gap-5 overflow-hidden rounded-2xl border p-6",
        isInk
          ? "border-transparent bg-ink-glow text-ink-foreground shadow-lg shadow-black/20"
          : "bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-sm font-medium",
            isInk ? "text-white/70" : "text-muted-foreground"
          )}
        >
          {label}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={hidden ? "Show balance" : "Hide balance"}
          onClick={() => setHidden((h) => !h)}
          className={cn(isInk && "text-white/80 hover:bg-white/10 hover:text-white")}
        >
          {hidden ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
      </div>

      <div className="flex flex-col items-start gap-2">
        <Amount value={balance} currency={currency} size="display" masked={hidden} />
        {change !== undefined && (
          <Delta
            value={change}
            suffix={changeLabel}
            className={cn(isInk && "bg-white/15 text-white [&_span]:text-white/70")}
          />
        )}
      </div>

      {history && history.length > 1 && (
        <Sparkline
          data={history}
          height={56}
          color={isInk ? "var(--brand)" : undefined}
          className="-mx-1"
        />
      )}

      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export { BalanceCard }
