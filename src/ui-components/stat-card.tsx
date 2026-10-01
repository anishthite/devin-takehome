import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Delta } from "@/ui-components/delta"

const statIconVariants = cva(
  "flex size-8 items-center justify-center rounded-lg [&_svg]:size-4",
  {
    variants: {
      tone: {
        neutral: "bg-secondary text-secondary-foreground",
        ink: "bg-primary text-primary-foreground",
        gain: "bg-gain-soft text-gain",
        loss: "bg-loss-soft text-loss",
        warning: "bg-warning-soft text-warning",
        info: "bg-info-soft text-info",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
)

type StatCardProps = Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof statIconVariants> & {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
  change?: number
  invertChange?: boolean
  hint?: React.ReactNode
}

function StatCard({
  label,
  value,
  icon,
  change,
  invertChange,
  hint,
  tone,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      data-slot="stat-card"
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-5 text-card-foreground shadow-sm",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon && (
          <span className={statIconVariants({ tone })}>
            {icon}
          </span>
        )}
      </div>
      <div className="tabular text-2xl font-semibold tracking-tight">{value}</div>
      {(change !== undefined || hint) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {change !== undefined && <Delta value={change} invert={invertChange} />}
          {hint}
        </div>
      )}
    </div>
  )
}

export { StatCard }
