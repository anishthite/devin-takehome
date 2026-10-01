import type { ComponentProps } from "react";
import { cn } from "@kit/lib/utils";

/** Native `<select>` styled like `@kit/ui/input`, so it posts with plain server-action forms. */
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}
