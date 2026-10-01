import * as React from "react"
import { APP_NAME } from "@kit/app"
import { cn } from "@kit/lib/utils"

function LogoMark({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="logo-mark"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-brand-foreground shadow-sm",
        className
      )}
      {...props}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
        <path d="M4 7h16M4 12h10M4 17h6" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function Logo({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="logo"
      className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}
      {...props}
    >
      <LogoMark />
      <span>{APP_NAME}</span>
    </div>
  )
}

export { Logo, LogoMark }
