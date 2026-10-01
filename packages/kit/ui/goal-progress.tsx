import * as React from "react"
import { cn } from "@kit/lib/utils"
import { Amount } from "@kit/ui/amount"
import { Progress } from "@kit/ui/progress"

type GoalProgressProps = Omit<React.ComponentProps<"div">, "children"> & {
  name: string
  current: number
  target: number
  currency?: string
  icon?: React.ReactNode
  dueLabel?: string
}

function GoalProgress({
  name,
  current,
  target,
  currency,
  icon,
  dueLabel,
  className,
  ...props
}: GoalProgressProps) {
  const pct = Math.min(100, Math.round((current / target) * 100))

  return (
    <div data-slot="goal-progress" className={cn("flex flex-col gap-3", className)} {...props}>
      <div className="flex items-center gap-3">
        {icon && (
          <span className="flex size-9 items-center justify-center rounded-lg bg-gain-soft text-gain [&_svg]:size-4">
            {icon}
          </span>
        )}
        <div className="flex flex-1 flex-col">
          <span className="text-sm font-medium">{name}</span>
          {dueLabel && <span className="text-xs text-muted-foreground">{dueLabel}</span>}
        </div>
        <span className="tabular text-sm font-semibold">{pct}%</span>
      </div>
      <Progress value={pct} className="bg-gain-soft [&>[data-slot=progress-indicator]]:bg-gain" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <Amount value={current} currency={currency} size="sm" hideCents className="text-foreground" />
        <span className="tabular">
          of <Amount value={target} currency={currency} size="sm" hideCents className="font-medium" />
        </span>
      </div>
    </div>
  )
}

export { GoalProgress }
