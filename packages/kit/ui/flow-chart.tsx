"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { cn } from "@kit/lib/utils"
import { Amount } from "@kit/ui/amount"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@kit/ui/chart"

type FlowPoint = {
  label: string
  inflow: number
  outflow: number
}

type FlowChartProps = Omit<React.ComponentProps<"div">, "children"> & {
  data: FlowPoint[]
  currency?: string
  /** `inflow`/`outflow` are in minor units (cents) */
  minor?: boolean
}

const config = {
  inflow: { label: "In", color: "var(--chart-1)" },
  outflow: { label: "Out", color: "var(--chart-2)" },
} satisfies ChartConfig

function FlowChart({ data, currency = "USD", minor = false, className, ...props }: FlowChartProps) {
  return (
    <div data-slot="flow-chart" className={cn("w-full", className)} {...props}>
      <ChartContainer config={config} className="aspect-auto h-48 w-full">
        <BarChart data={data} barGap={2} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)" }}
            content={
              <ChartTooltipContent
                className="min-w-40"
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        aria-hidden
                        className="size-2 rounded-full"
                        style={{ background: `var(--color-${name})` }}
                      />
                      {config[name as keyof typeof config]?.label ?? name}
                    </span>
                    <Amount value={Number(value)} currency={currency} minor={minor} size="sm" />
                  </div>
                )}
              />
            }
          />
          <Bar dataKey="inflow" fill="var(--color-inflow)" radius={[4, 4, 0, 0]} maxBarSize={12} />
          <Bar dataKey="outflow" fill="var(--color-outflow)" radius={[4, 4, 0, 0]} maxBarSize={12} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}

function FlowLegend({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="flow-legend"
      className={cn("flex items-center gap-4 text-xs text-muted-foreground", className)}
      {...props}
    >
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="size-2 rounded-full bg-chart-1" /> {config.inflow.label}
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="size-2 rounded-full bg-chart-2" /> {config.outflow.label}
      </span>
    </div>
  )
}

export { FlowChart, FlowLegend, type FlowPoint }
