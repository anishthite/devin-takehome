import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const bannerVariants = cva(
  "flex items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-medium [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        warning: "bg-warning-strong text-warning-strong-foreground",
        brand: "bg-brand-strong text-brand-foreground",
        ink: "bg-ink text-ink-foreground",
      },
    },
    defaultVariants: { variant: "warning" },
  }
)

function Banner({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof bannerVariants>) {
  return (
    <div
      data-slot="banner"
      role="status"
      className={cn(bannerVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Banner, bannerVariants }
