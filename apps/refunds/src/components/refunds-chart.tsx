"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Amount } from "@kit/ui/amount";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@kit/ui/chart";

export interface RefundsChartPoint {
  label: string;
  requested: number;
  issued: number;
}

const config = {
  requested: { label: "Requested", color: "var(--chart-2)" },
  issued: { label: "Issued", color: "var(--info)" },
} satisfies ChartConfig;

/** Daily requested vs issued refund volume, in cents. */
export function RefundsChart({ data }: { data: RefundsChartPoint[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-48 w-full">
      <BarChart data={data} barGap={2} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={
            <ChartTooltipContent
              className="min-w-40"
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span aria-hidden className="size-2 rounded-full" style={{ background: `var(--color-${name})` }} />
                    {config[name as keyof typeof config]?.label ?? name}
                  </span>
                  <Amount value={Number(value)} minor size="sm" />
                </div>
              )}
            />
          }
        />
        <Bar dataKey="requested" fill="var(--color-requested)" radius={[4, 4, 0, 0]} maxBarSize={12} />
        <Bar dataKey="issued" fill="var(--color-issued)" radius={[4, 4, 0, 0]} maxBarSize={12} />
      </BarChart>
    </ChartContainer>
  );
}

export function RefundsChartLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="size-2 rounded-full bg-chart-2" /> Requested
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="size-2 rounded-full bg-info" /> Issued
      </span>
    </div>
  );
}
