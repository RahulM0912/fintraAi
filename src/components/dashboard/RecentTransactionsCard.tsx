import Link from "next/link";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStore } from "@/store/dashboardStore";
import { format } from "date-fns";

/* Recent activity as an editorial ledger: date column, description,
   category, signed tabular amount. No icon chips, no colored bars —
   the sign carries direction, color only reinforces it. */

export function RecentTransactionsCard() {
  // Rows come from the page-level /api/dashboard fetch.
  const { recentTransactions, hydrated } = useDashboardStore();

  if (!hydrated) {
    return (
      <section className="border-t border-[var(--hairline)] pt-6">
        <div className="mb-5 flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-14" />
        </div>
        <div className="space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Recent activity" className="border-t border-[var(--hairline)] pt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
          Recent activity
        </h2>
        <Link
          href="/transactions"
          className="inline-flex min-h-11 items-center text-[13px] font-medium text-[var(--brand)] transition-colors duration-150 hover:text-[var(--brand-hover)]"
        >
          View all
        </Link>
      </div>

      {recentTransactions && recentTransactions.length > 0 ? (
        <ul className="divide-y divide-[var(--hairline)]">
          {recentTransactions.map((t) => {
            const isExpense = t.type === "expense";
            return (
              <li key={t.id} className="flex items-baseline gap-4 py-3.5">
                <span className="tnum w-14 shrink-0 text-xs text-[var(--ink-3)]">
                  {t.date ? format(new Date(t.date), "dd MMM") : ""}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--ink)]">
                  {t.description || t.category?.name || "Transaction"}
                  <span className="pl-2 text-[13px] font-normal text-[var(--ink-3)]">
                    {t.category?.name || "Uncategorized"}
                  </span>
                </span>
                <span
                  className={`tnum shrink-0 text-sm font-medium ${
                    isExpense ? "text-[var(--ink)]" : "text-[var(--pos)]"
                  }`}
                >
                  {isExpense ? "−" : "+"}₹
                  {(t.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-8 text-sm text-[var(--ink-2)]">
          Nothing here yet. Your latest transactions will appear as a running
          ledger.
        </p>
      )}
    </section>
  );
}
