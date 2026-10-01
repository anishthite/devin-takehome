import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { SnowflakeIcon, WifiIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const paymentCardVariants = cva(
  "relative flex aspect-[1.586] w-full max-w-sm flex-col justify-between overflow-hidden rounded-2xl p-5 text-white shadow-xl transition-all select-none",
  {
    variants: {
      variant: {
        ink: "bg-ink-glow shadow-black/30 ring-1 ring-white/10",
        emerald:
          "bg-[linear-gradient(135deg,#065f46_0%,#059669_55%,#34d399_120%)] shadow-brand/25",
        graphite: "bg-[linear-gradient(135deg,#27272a_0%,#3f3f46_60%,#71717a_130%)] shadow-black/25",
      },
    },
    defaultVariants: { variant: "ink" },
  }
)

type PaymentCardProps = Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof paymentCardVariants> & {
    last4: string
    holder: string
    expiry: string
    label?: string
    network?: "visa" | "mastercard"
    frozen?: boolean
  }

function NetworkMark({ network }: { network: "visa" | "mastercard" }) {
  if (network === "mastercard") {
    return (
      <span className="flex" aria-label="Mastercard">
        <span className="size-7 rounded-full bg-[#eb001b]/90" />
        <span className="-ml-3 size-7 rounded-full bg-[#f79e1b]/90 mix-blend-screen" />
      </span>
    )
  }
  return (
    <span className="text-xl font-black tracking-tight italic" aria-label="Visa">
      VISA
    </span>
  )
}

function PaymentCard({
  last4,
  holder,
  expiry,
  label = "Ledger",
  network = "visa",
  frozen = false,
  variant,
  className,
  ...props
}: PaymentCardProps) {
  return (
    <div
      data-slot="payment-card"
      data-frozen={frozen || undefined}
      className={cn(paymentCardVariants({ variant }), frozen && "saturate-0", className)}
      {...props}
    >
      <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full border-[28px] border-white/5" />
      <div className="flex items-start justify-between">
        <span className="text-sm font-semibold tracking-tight">{label}</span>
        <WifiIcon className="size-5 rotate-90 opacity-70" aria-hidden />
      </div>
      <div className="h-8 w-11 rounded-md bg-gradient-to-br from-amber-200 to-amber-400/80 opacity-90" />
      <div className="flex flex-col gap-3">
        <span className="font-mono text-lg tracking-[0.2em]">•••• •••• •••• {last4}</span>
        <div className="flex items-end justify-between">
          <div className="flex gap-6 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] tracking-wider text-white/60 uppercase">Card holder</span>
              <span className="font-medium">{holder}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] tracking-wider text-white/60 uppercase">Expires</span>
              <span className="tabular font-medium">{expiry}</span>
            </div>
          </div>
          <NetworkMark network={network} />
        </div>
      </div>
      {frozen && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-[2px]">
          <span className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium">
            <SnowflakeIcon className="size-3.5" /> Card frozen
          </span>
        </div>
      )}
    </div>
  )
}

export { PaymentCard, paymentCardVariants }
