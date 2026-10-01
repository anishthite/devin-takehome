"use client"

import * as React from "react"
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts"
import { cn } from "@/lib/utils"

type SparklineProps = Omit<React.ComponentProps<"div">, "children"> & {
  data: number[]
  /** Any CSS color; defaults to gain/loss based on first vs last point */
  color?: string
  height?: number
}

function Sparkline({ data, color, height = 48, className, ...props }: SparklineProps) {
  const id = React.useId().replace(/:/g, "")
  const points = data.map((v, i) => ({ i, v }))
  const stroke =
    color ?? (data[data.length - 1] >= data[0] ? "var(--gain)" : "var(--loss)")

  return (
    <div data-slot="sparkline" className={cn("w-full", className)} style={{ height }} {...props}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area
            type="monotone"
            dataKey="v"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#spark-${id})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export { Sparkline }
