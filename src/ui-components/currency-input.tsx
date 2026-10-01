"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type CurrencyInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange" | "size"> & {
  value: string
  onValueChange: (value: string) => void
  currencySymbol?: string
  currencyCode?: string
  size?: "default" | "hero"
}

function sanitize(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, "")
  const [whole, ...rest] = cleaned.split(".")
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole
}

function CurrencyInput({
  value,
  onValueChange,
  currencySymbol = "$",
  currencyCode = "USD",
  size = "default",
  className,
  onBlur,
  ...props
}: CurrencyInputProps) {
  const hero = size === "hero"

  return (
    <div
      data-slot="currency-input"
      data-size={size}
      className={cn(
        "flex w-full items-center gap-2 rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-[input[aria-invalid=true]]:border-destructive dark:bg-input/30",
        hero ? "h-20 rounded-xl px-5" : "h-9 px-3",
        className
      )}
    >
      <span className={cn("text-muted-foreground", hero ? "text-3xl font-medium" : "text-sm")}>
        {currencySymbol}
      </span>
      <input
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        value={value}
        onChange={(e) => onValueChange(sanitize(e.target.value))}
        onBlur={(e) => {
          if (value && !Number.isNaN(Number(value))) onValueChange(Number(value).toFixed(2))
          onBlur?.(e)
        }}
        className={cn(
          "tabular w-full min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:text-muted-foreground/50",
          hero ? "text-4xl tracking-tight" : "text-sm"
        )}
        {...props}
      />
      <span
        className={cn(
          "rounded-md bg-secondary px-2 py-0.5 font-medium text-secondary-foreground",
          hero ? "text-sm" : "text-xs"
        )}
      >
        {currencyCode}
      </span>
    </div>
  )
}

export { CurrencyInput }
