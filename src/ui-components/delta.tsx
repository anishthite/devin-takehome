import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const deltaVariants = cva(
  "tabular inline-flex items-center gap-0.5 font-medium whitespace-nowrap [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        pill: "rounded-full px-2 py-0.5 text-xs",
        inline: "text-sm",
      },
      trend: {
        up: "text-gain",
        down: "text-loss",
        flat: "text-muted-foreground",
      },
    },
    compoundVariants: [
      { variant: "pill", trend: "up", className: "bg-gain-soft" },
      { variant: "pill", trend: "down", className: "bg-loss-soft" },
      { variant: "pill", trend: "flat", className: "bg-muted" },
    ],
    defaultVariants: { variant: "pill", trend: "flat" },
  }
)

type DeltaProps = Omit<React.ComponentProps<"span">, "children"> &
  Pick<VariantProps<typeof deltaVariants>, "variant"> & {
    /** Percentage change, e.g. 2.4 for +2.4% */
    value: number
    /** Invert color semantics (e.g. for spending, where down is good) */
    invert?: boolean
    suffix?: React.ReactNode
  }

function Delta({ value, invert = false, variant, suffix, className, ...props }: DeltaProps) {
  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat"
  const trend =
    direction === "flat" ? "flat" : (direction === "up") !== invert ? "up" : "down"
  const Icon =
    direction === "up" ? ArrowUpRightIcon : direction === "down" ? ArrowDownRightIcon : MinusIcon

  return (
    <span
      data-slot="delta"
      className={cn(deltaVariants({ variant, trend }), className)}
      {...props}
    >
      <Icon aria-hidden />
      {Math.abs(value).toFixed(2)}%
      {suffix && <span className="ml-1 font-normal text-muted-foreground">{suffix}</span>}
    </span>
  )
}

export { Delta, deltaVariants }
