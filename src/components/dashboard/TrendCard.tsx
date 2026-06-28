"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendPoint {
  year: number;
  month: number;
  label: string;
  income: number;
  expense: number;
  net: number;
}

const RANGES = [6, 12] as const;
type Range = (typeof RANGES)[number];

// Recharts renders to SVG and passes stroke/fill/stop-color as presentation
// attributes, which do NOT resolve CSS var(). So read the brand tokens off the
// document at runtime and re-read when the theme class flips.
interface ChartTokens {
  pos: string;
  brand: string;
  ink3: string;
  hairline: string;
}
const FALLBACK_TOKENS: ChartTokens = {
  pos: "#15a860",
  brand: "#5b52e8",
  ink3: "#8890b0",
  hairline: "#dde0ee",
};

function readTokens(): ChartTokens {
  if (typeof window === "undefined") return FALLBACK_TOKENS;
  const cs = getComputedStyle(document.documentElement);
  const get = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
  return {
    pos: get("--pos", FALLBACK_TOKENS.pos),
    brand: get("--brand", FALLBACK_TOKENS.brand),
    ink3: get("--ink-3", FALLBACK_TOKENS.ink3),
    hairline: get("--hairline", FALLBACK_TOKENS.hairline),
  };
}

function compactINR(n: number) {
  if (Math.abs(n) >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (Math.abs(n) >= 1_000) return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${n}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as TrendPoint;
  return (
    <div className="bg-[var(--surface)] border border-[var(--hairline)] px-3 py-2 rounded-xl shadow-lg text-xs">
      <p className="font-bold text-[var(--ink)] mb-1">{label} {p.year}</p>
      <p className="text-[var(--pos)] font-semibold">Income ₹{p.income.toLocaleString("en-IN")}</p>
      <p className="text-[var(--neg)] font-semibold">Expense ₹{p.expense.toLocaleString("en-IN")}</p>
      <p className={cn("font-semibold mt-0.5", p.net >= 0 ? "text-[var(--ink)]" : "text-[var(--neg)]")}>
        Net {p.net < 0 ? "-" : ""}₹{Math.abs(p.net).toLocaleString("en-IN")}
      </p>
    </div>
  );
};

export function TrendCard() {
  const [range, setRange] = useState<Range>(6);
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [tokens, setTokens] = useState<ChartTokens>(FALLBACK_TOKENS);

  useEffect(() => {
    setMounted(true);
    setTokens(readTokens());
    // Re-read colors when the theme class toggles on <html>.
    const obs = new MutationObserver(() => setTokens(readTokens()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const fetchTrends = () => {
      setIsLoading(true);
      fetch(`/api/trends?months=${range}&_t=${Date.now()}`, { cache: "no-store" })
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status}`);
          return res.json();
        })
        .then((data) => setPoints(data.points ?? []))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    };
    fetchTrends();
    window.addEventListener("transaction-added", fetchTrends);
    return () => window.removeEventListener("transaction-added", fetchTrends);
  }, [range, mounted]);

  const hasData = useMemo(
    () => points.some((p) => p.income > 0 || p.expense > 0),
    [points]
  );

  if (isLoading) {
    return (
      <Card className="bg-[var(--surface)] border border-[var(--hairline)] shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2rem]">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
          <Skeleton className="h-[200px] w-full rounded-2xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[var(--surface)] border border-[var(--hairline)] shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2rem]">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="font-sora text-[17px] font-bold text-[var(--ink)] tracking-tight">
              Cash Flow Trend
            </h2>
            <p className="text-xs text-[var(--ink-3)] mt-0.5">Income vs expenses over time</p>
          </div>
          {/* Range toggle */}
          <div className="flex items-center gap-0.5 rounded-full bg-[var(--surface-2)] p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "cursor-pointer text-[11px] font-bold px-3 py-1 rounded-full transition-colors",
                  range === r
                    ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm"
                    : "text-[var(--ink-3)] hover:text-[var(--ink)]"
                )}
              >
                {r}M
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-2)]">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--pos)]" /> Income
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-2)]">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand)]" /> Expense
          </span>
        </div>

        <div className="h-[220px] w-full relative">
          {!hasData && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--ink-3)] pointer-events-none z-10">
              No activity in the last {range} months yet
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tokens.pos} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={tokens.pos} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tokens.brand} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={tokens.brand} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={tokens.hairline} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: tokens.ink3 }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 10, fill: tokens.ink3 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={compactINR}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: tokens.hairline }} />
              <Area
                type="monotone"
                dataKey="income"
                stroke={tokens.pos}
                strokeWidth={2}
                fill="url(#incomeFill)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={mounted}
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke={tokens.brand}
                strokeWidth={2}
                fill="url(#expenseFill)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={mounted}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
