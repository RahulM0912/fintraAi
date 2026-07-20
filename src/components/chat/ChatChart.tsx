"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPayload } from "@/lib/chat/types";
import { useChartTokens, compactINR } from "@/lib/useChartTokens";

/* Charts for chat answers, styled after how Claude presents inline charts: no
   boxed header — the prose right above the chart already names it, so a
   second title would just repeat it — and income/spending told apart by
   direct end-of-line labels instead of a legend swatch row. `chart.title`
   survives as an sr-only heading so the payload stays meaningful without the
   visual chrome. Same mark system as the dashboard: income wears
   --chart-pos, spending --chart-neg, ranked shares the --chart-1..5 tints. */

interface Props {
  chart: ChartPayload;
  compact?: boolean;
}

export function ChatChart({ chart, compact = false }: Props) {
  const isSeries = chart.kind === "series";
  const twoSeries = isSeries && chart.points.some((p) => p.income > 0);

  return (
    <div className="my-3 rounded-lg border border-border px-4 py-3">
      <h3 className="sr-only">{chart.title}</h3>
      {chart.kind === "shares" && <ShareBars items={chart.items} />}
      {chart.kind === "progress" && <ProgressBars items={chart.items} />}
      {chart.kind === "series" && (
        <SeriesChart
          unit={chart.unit}
          style={chart.style}
          points={chart.points}
          hasIncome={twoSeries}
          compact={compact}
        />
      )}
    </div>
  );
}

// ─── Ranked category shares (plain divs — no SVG needed) ────────────────────────

function ShareBars({ items }: { items: { name: string; amount: number; pct: number }[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={item.name}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate font-medium text-[var(--ink)]">{item.name}</span>
            <span className="tnum shrink-0 text-[var(--ink-2)]">
              ₹{item.amount.toLocaleString("en-IN")}
              <span className="pl-2 text-[var(--ink-3)]">{Math.round(item.pct)}%</span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(Math.max(Math.round(item.pct), 2), 100)}%`,
                backgroundColor: `var(--chart-${Math.min(i + 1, 5)})`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Budget usage meters ─────────────────────────────────────────────────────────

function ProgressBars({
  items,
}: {
  items: { name: string; cap: number; spent: number; pct: number }[];
}) {
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const over = item.pct >= 100;
        const warn = item.pct >= 80;
        return (
          <li key={item.name}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="truncate font-medium text-[var(--ink)]">{item.name}</span>
              <span className="tnum shrink-0 text-[var(--ink-2)]">
                ₹{item.spent.toLocaleString("en-IN")}
                <span className="text-[var(--ink-3)]"> / ₹{item.cap.toLocaleString("en-IN")}</span>
                <span className={`pl-2 ${warn ? "font-medium text-[var(--neg)]" : "text-[var(--ink-3)]"}`}>
                  {Math.round(item.pct)}%{over ? " — over" : ""}
                </span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(Math.max(item.pct, 2), 100)}%`,
                  backgroundColor: warn ? "var(--chart-neg)" : "var(--chart-1)",
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Time series (recharts) ──────────────────────────────────────────────────────

interface SeriesPoint {
  label: string;
  income: number;
  expense: number;
}

const SeriesTooltip = ({
  active,
  payload,
  label,
  unit,
  hasIncome,
}: {
  active?: boolean;
  payload?: { payload: SeriesPoint }[];
  label?: string;
  unit: "day" | "month";
  hasIncome: boolean;
}) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-[var(--hairline)] bg-[var(--surface)] px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-[var(--ink)]">
        {unit === "day" ? `Day ${label}` : label}
      </p>
      <div className="tnum mt-1.5 space-y-1 text-[var(--ink-2)]">
        {hasIncome && (
          <p className="flex items-center gap-2">
            <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--chart-pos)]" />
            Income
            <span className="ml-auto pl-4 font-medium text-[var(--ink)]">
              ₹{p.income.toLocaleString("en-IN")}
            </span>
          </p>
        )}
        <p className="flex items-center gap-2">
          <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--chart-neg)]" />
          Spending
          <span className="ml-auto pl-4 font-medium text-[var(--ink)]">
            ₹{p.expense.toLocaleString("en-IN")}
          </span>
        </p>
      </div>
    </div>
  );
};

/* Direct label at the last point of a series — replaces a legend swatch row,
   same device the dashboard TrendCard uses. */
function makeEndLabel(name: string, color: string, lastIndex: number, dy: number) {
  const EndLabel = (props: { x?: number | string; y?: number | string; index?: number }) => {
    const { x, y, index } = props;
    if (index !== lastIndex || x == null || y == null) return <g />;
    return (
      <text x={Number(x) + 8} y={Number(y)} dy={dy} fill={color} fontSize={11} fontWeight={500}>
        {name}
      </text>
    );
  };
  return EndLabel;
}

function SeriesChart({
  unit,
  style,
  points,
  hasIncome,
  compact,
}: {
  unit: "day" | "month";
  style?: "bar" | "line" | "area";
  points: SeriesPoint[];
  hasIncome: boolean;
  compact: boolean;
}) {
  const { tokens, mounted } = useChartTokens();
  if (!mounted) return <div style={{ height: compact ? 150 : 180 }} />;

  // Payloads cached before `style` existed fall back to the shape heuristic.
  const kind = style ?? (unit === "day" ? "bar" : "line");
  const height = compact ? 150 : 180;
  const axisTick = { fontSize: 11, fill: tokens.ink3 };
  const lastIndex = points.length - 1;
  // Bars have no single "end" per category once grouped side by side, so a
  // direct end-label would collide there — a plain inline legend reads better.
  const showLegendRow = hasIncome && kind === "bar";
  // Line/area end-labels need breathing room on the right for the text.
  const margin = { top: 4, right: kind === "bar" ? 8 : 28, left: -8, bottom: 0 };
  const last = points[lastIndex];
  const incomeOnTop = !last || last.income >= last.expense;

  const grid = <CartesianGrid stroke={tokens.hairline} strokeWidth={1} vertical={false} />;
  const xAxis = (
    <XAxis
      dataKey="label"
      tick={axisTick}
      axisLine={false}
      tickLine={false}
      dy={6}
      minTickGap={20}
      interval="preserveStartEnd"
    />
  );
  const yAxis = (
    <YAxis
      tick={axisTick}
      axisLine={false}
      tickLine={false}
      tickFormatter={compactINR}
      width={52}
    />
  );
  const tooltip = (cursor: object | boolean) => (
    <Tooltip content={<SeriesTooltip unit={unit} hasIncome={hasIncome} />} cursor={cursor} />
  );

  return (
    <div>
      {showLegendRow && (
        <div className="mb-2 flex items-center gap-3 text-[11px] text-[var(--ink-2)]">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--chart-pos)]" />
            Income
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--chart-neg)]" />
            Spending
          </span>
        </div>
      )}
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          {kind === "bar" ? (
            <BarChart data={points} margin={margin} barGap={2}>
              {grid}
              {xAxis}
              {yAxis}
              {tooltip({ fill: tokens.hairline, fillOpacity: 0.3 })}
              {hasIncome && (
                <Bar
                  dataKey="income"
                  fill={tokens.pos}
                  maxBarSize={24}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              )}
              <Bar
                dataKey="expense"
                fill={tokens.neg}
                maxBarSize={24}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          ) : kind === "area" ? (
            <AreaChart data={points} margin={margin}>
              {grid}
              {xAxis}
              {yAxis}
              {tooltip({ stroke: tokens.hairline, strokeWidth: 1 })}
              {hasIncome && (
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke={tokens.pos}
                  strokeWidth={2}
                  fill={tokens.pos}
                  fillOpacity={0.1}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                  label={makeEndLabel("Income", tokens.pos, lastIndex, incomeOnTop ? -8 : 16)}
                />
              )}
              <Area
                type="monotone"
                dataKey="expense"
                stroke={tokens.neg}
                strokeWidth={2}
                fill={tokens.neg}
                fillOpacity={0.1}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={false}
                label={
                  hasIncome
                    ? makeEndLabel("Spending", tokens.neg, lastIndex, incomeOnTop ? 16 : -8)
                    : undefined
                }
              />
            </AreaChart>
          ) : (
            <LineChart data={points} margin={margin}>
              {grid}
              {xAxis}
              {yAxis}
              {tooltip({ stroke: tokens.hairline, strokeWidth: 1 })}
              {hasIncome && (
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke={tokens.pos}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                  label={makeEndLabel("Income", tokens.pos, lastIndex, incomeOnTop ? -8 : 16)}
                />
              )}
              <Line
                type="monotone"
                dataKey="expense"
                stroke={tokens.neg}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={false}
                label={
                  hasIncome
                    ? makeEndLabel("Spending", tokens.neg, lastIndex, incomeOnTop ? 16 : -8)
                    : undefined
                }
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
