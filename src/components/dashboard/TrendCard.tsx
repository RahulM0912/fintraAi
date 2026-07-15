"use client";

import React, { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";
import { useChartTokens, compactINR } from "@/lib/useChartTokens";
import type { TrendPoint } from "@/lib/server/dashboardData";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const RANGES = [6, 12] as const;
type Range = (typeof RANGES)[number];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as TrendPoint;
  return (
    <div className="rounded-lg border border-[var(--hairline)] bg-[var(--surface)] px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-[var(--ink)]">
        {label} {p.year}
      </p>
      <div className="tnum mt-1.5 space-y-1 text-[var(--ink-2)]">
        <p className="flex items-center gap-2">
          <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--chart-pos)]" />
          Income <span className="ml-auto pl-4 font-medium text-[var(--ink)]">₹{p.income.toLocaleString("en-IN")}</span>
        </p>
        <p className="flex items-center gap-2">
          <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--chart-neg)]" />
          Spending <span className="ml-auto pl-4 font-medium text-[var(--ink)]">₹{p.expense.toLocaleString("en-IN")}</span>
        </p>
        <p className="flex items-center gap-2 border-t border-[var(--hairline)] pt-1">
          <span aria-hidden className="h-2 w-2" />
          Net
          <span className={cn("ml-auto pl-4 font-medium", p.net < 0 ? "text-[var(--neg)]" : "text-[var(--ink)]")}>
            {p.net < 0 ? "−" : ""}₹{Math.abs(p.net).toLocaleString("en-IN")}
          </span>
        </p>
      </div>
    </div>
  );
};

/* Direct label at the last point of a series — replaces a legend. */
function makeEndLabel(name: string, color: string, lastIndex: number, dy: number) {
  const EndLabel = (props: { x?: number | string; y?: number | string; index?: number }) => {
    const { x, y, index } = props;
    if (index !== lastIndex || x == null || y == null) return <g />;
    return (
      <text x={Number(x) + 8} y={Number(y)} dy={dy} fill={color} fontSize={12} fontWeight={500}>
        {name}
      </text>
    );
  };
  return EndLabel;
}

export function TrendCard() {
  const [range, setRange] = useState<Range>(6);
  // The store holds 12 months (from /api/dashboard); the toggle just slices —
  // switching 6M/12M is instant, no refetch.
  const { trendPoints, hydrated } = useDashboardStore();
  const { tokens, mounted } = useChartTokens();

  const points = useMemo(() => trendPoints.slice(-range), [trendPoints, range]);
  const isLoading = !mounted || !hydrated;

  const hasData = useMemo(
    () => points.some((p) => p.income > 0 || p.expense > 0),
    [points]
  );

  // Nudge the two end labels apart based on which line finishes on top.
  const last = points[points.length - 1];
  const incomeOnTop = !last || last.income >= last.expense;

  if (isLoading) {
    return (
      <section className="border-t border-[var(--hairline)] pt-6">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-[240px] w-full rounded-xl" />
      </section>
    );
  }

  return (
    <section aria-label="Cash flow trend" className="border-t border-[var(--hairline)] pt-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
            Cash flow
          </h2>
          <p className="mt-1 text-[13px] text-[var(--ink-2)]">
            Income against spending, month by month
          </p>
        </div>
        <div className="flex items-center" role="group" aria-label="Chart range">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={cn(
                "cursor-pointer min-h-11 px-3 text-[13px] transition-colors duration-150 ease-out",
                range === r
                  ? "font-semibold text-[var(--ink)] underline decoration-[var(--brand)] decoration-2 underline-offset-8"
                  : "text-[var(--ink-3)] hover:text-[var(--ink)]"
              )}
            >
              {r}M
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[240px] w-full">
        {!hasData && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-[13px] text-[var(--ink-3)]">
            No activity in the last {range} months yet
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 72, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={tokens.hairline} strokeWidth={1} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: tokens.ink3 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tick={{ fontSize: 11, fill: tokens.ink3 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={compactINR}
              width={56}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: tokens.hairline, strokeWidth: 1 }} />
            <Line
              type="monotone"
              dataKey="income"
              stroke={tokens.pos}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={false}
              label={makeEndLabel("Income", tokens.pos, points.length - 1, incomeOnTop ? -8 : 16)}
            />
            <Line
              type="monotone"
              dataKey="expense"
              stroke={tokens.neg}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={false}
              label={makeEndLabel("Spending", tokens.neg, points.length - 1, incomeOnTop ? 16 : -8)}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
