import * as React from "react"
import { cn } from "@kit/lib/utils"

function DescriptionList({ className, ...props }: React.ComponentProps<"dl">) {
  return <dl data-slot="description-list" className={cn("space-y-3 text-sm", className)} {...props} />
}

type DescriptionItemProps = Omit<React.ComponentProps<"div">, "children"> & {
  term: React.ReactNode
  children: React.ReactNode
  /** Render the value in the mono face, for IDs and reference codes */
  mono?: boolean
}

function DescriptionItem({ term, mono = false, className, children, ...props }: DescriptionItemProps) {
  return (
    <div data-slot="description-item" className={cn("min-w-0", className)} {...props}>
      <dt className="text-xs text-muted-foreground">{term}</dt>
      <dd className={cn("mt-0.5 truncate font-medium", mono && "font-mono text-xs font-normal text-secondary-foreground")}>
        {children}
      </dd>
    </div>
  )
}

export { DescriptionList, DescriptionItem }
