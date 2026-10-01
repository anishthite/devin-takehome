import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const amountVariants = cva("tabular inline-flex items-baseline font-semibold tracking-tight", {
  variants: {
    size: {
      sm: "text-sm",
      md: "text-base",
      lg: "text-xl",
      xl: "text-3xl",
      display: "text-5xl tracking-[-0.03em]",
    },
  },
  defaultVariants: { size: "md" },
})

type AmountProps = Omit<React.ComponentProps<"span">, "children"> &
  VariantProps<typeof amountVariants> & {
    value: number
    currency?: string
    locale?: string
    /** Prefix positive values with "+" */
    signed?: boolean
    /** Color by sign (gain / loss) */
    tone?: "auto" | "neutral"
    hideCents?: boolean
    /** Replace digits with dots, e.g. for privacy mode */
    masked?: boolean
    /** `value` is in minor units (cents), as stored by the ledger */
    minor?: boolean
  }

function Amount({
  value,
  currency = "USD",
  locale = "en-US",
  signed = false,
  tone = "neutral",
  hideCents = false,
  masked = false,
  minor = false,
  size,
  className,
  ...props
}: AmountProps) {
  const major = minor ? value / 100 : value
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    ...(hideCents && { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  }).formatToParts(Math.abs(major))

  const sign = value < 0 ? "−" : signed && value > 0 ? "+" : ""
  const toneClass =
    tone === "auto" ? (value > 0 ? "text-gain" : value < 0 ? "text-loss" : "") : ""

  const fractionIndex = parts.findIndex((p) => p.type === "decimal")
  const whole = (fractionIndex === -1 ? parts : parts.slice(0, fractionIndex))
    .map((p) => p.value)
    .join("")
  const fraction =
    fractionIndex === -1 ? "" : parts.slice(fractionIndex).map((p) => p.value).join("")

  return (
    <span
      data-slot="amount"
      aria-label={masked ? "Hidden amount" : undefined}
      className={cn(amountVariants({ size }), toneClass, className)}
      {...props}
    >
      {masked ? (
        <span className="tracking-widest">••••••</span>
      ) : (
        <>
          {sign && <span>{sign}</span>}
          <span>{whole}</span>
          {fraction && <span className="text-[0.62em] opacity-60">{fraction}</span>}
        </>
      )}
    </span>
  )
}

export { Amount, amountVariants }
