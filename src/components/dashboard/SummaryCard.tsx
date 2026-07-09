import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStore } from "@/store/dashboardStore";

/* The month's raw numbers, typeset like a print figure block: three flat
   columns on a hairline rule. No cards, no icons — the type is the design. */

function inr(n: number) {
  return `₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;
}

function Figure({
  label,
  value,
  sublabel,
  negative,
}: {
  label: string;
  value: string;
  sublabel: string;
  negative?: boolean;
}) {
  return (
    <div className="py-5 sm:py-1 first:pt-1 last:pb-1 sm:px-8 sm:first:pl-0 sm:last:pr-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
        {label}
      </p>
      <p
        className={`font-display tnum mt-2 text-3xl sm:text-[34px] leading-none ${
          negative ? "text-[var(--neg)]" : "text-[var(--ink)]"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-[13px] text-[var(--ink-2)]">{sublabel}</p>
    </div>
  );
}

export default function SummaryCard() {
  const { totalIncome, totalExpense, netBalance, hydrated } = useDashboardStore();

  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => setIsMounted(true), []);

  const isLoading = !isMounted || !hydrated;
  const balance = netBalance ?? 0;
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date());

  if (isLoading) {
    return (
      <section className="border-t border-[var(--hairline)] pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="py-5 sm:py-1 sm:px-8 sm:first:pl-0">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-8 w-32" />
              <Skeleton className="mt-3 h-3 w-24" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="This month's totals"
      className="border-t border-[var(--hairline)] pt-6"
    >
      <div className="grid grid-cols-1 divide-y divide-[var(--hairline)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Figure
          label="Balance"
          value={`${balance < 0 ? "−" : ""}${inr(balance)}`}
          sublabel={balance < 0 ? `overspent this ${monthName}` : `kept this ${monthName}`}
          negative={balance < 0}
        />
        <Figure
          label="Money in"
          value={inr(totalIncome ?? 0)}
          sublabel="income so far"
        />
        <Figure
          label="Money out"
          value={inr(totalExpense ?? 0)}
          sublabel="spending so far"
        />
      </div>
    </section>
  );
}
