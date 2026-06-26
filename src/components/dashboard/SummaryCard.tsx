import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStore } from "@/store/dashboardStore";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";

const cardBase =
  "bg-[var(--surface)] border border-[var(--hairline)] shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2rem] relative overflow-hidden";

export default function SummaryCard() {
  const {
    totalIncome,
    totalExpense,
    netBalance,
    isSummaryLoading
  } = useDashboardStore();

  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const isLoading = !isMounted || isSummaryLoading;

  // Format currency: split integer and fractional parts
  const formatCurrencyParts = (amount: number) => {
    const formatter = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const formatted = formatter.format(amount);
    const [intPart, fracPart] = formatted.split(".");
    return { intPart, fracPart };
  };

  const balance = netBalance ?? 0;
  const balanceParts = formatCurrencyParts(balance);
  const incomeFormatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(totalIncome ?? 0);
  const expenseFormatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(totalExpense ?? 0);
  const currentMonthStr = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date()).toUpperCase();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        {/* Total Balance Skeleton */}
        <Card className={`md:col-span-6 ${cardBase}`}>
          <CardContent className="p-8 h-full flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-10 w-48" />
          </CardContent>
        </Card>

        {/* Total Income Skeleton */}
        <Card className={`md:col-span-3 ${cardBase}`}>
          <CardContent className="p-6 flex flex-col h-full justify-center">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>

        {/* Total Expenses Skeleton */}
        <Card className={`md:col-span-3 ${cardBase}`}>
          <CardContent className="p-6 flex flex-col h-full justify-center">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
      {/* Total Balance Card (hero) */}
      <Card className={`md:col-span-6 ${cardBase}`}>
        {/* Brand glow accent */}
        <div
          className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full"
          style={{ background: "radial-gradient(circle, var(--brand-glow) 0%, transparent 70%)" }}
        />
        <CardContent className="p-8 h-full flex flex-col justify-center relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-lg bg-[var(--brand-bg)] border border-[var(--brand-border)] flex items-center justify-center">
              <Wallet className="h-3.5 w-3.5 text-[var(--brand)]" />
            </div>
            <h3 className="text-[13px] font-medium text-[var(--ink-2)]">Total Balance</h3>
            <span className="text-[10px] font-bold tracking-widest text-[var(--ink-3)] uppercase bg-[var(--surface-2)] px-2 py-0.5 rounded-full">{currentMonthStr}</span>
          </div>
          <div className="flex items-baseline mt-2">
            <span className={`font-sora text-4xl font-bold ${balance < 0 ? "text-[var(--neg)]" : "text-[var(--ink)]"}`}>
              {balance < 0 ? "-" : ""}₹{balanceParts.intPart.replace("-", "")}
            </span>
            <span className="font-sora text-xl font-bold text-[var(--ink-3)]">.{balanceParts.fracPart}</span>
          </div>
        </CardContent>
      </Card>

      {/* Total Income Card */}
      <Card className={`md:col-span-3 ${cardBase}`}>
        <CardContent className="p-6 flex flex-col h-full justify-center">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-xl bg-[var(--pos-bg)] flex items-center justify-center">
                <ArrowDownRight className="h-4 w-4 text-[var(--pos)]" />
              </div>
              <h3 className="text-[11px] font-bold text-[var(--pos)] tracking-wider uppercase">Total Income</h3>
            </div>
            <p className="font-sora text-2xl font-bold text-[var(--ink)]">₹{incomeFormatted}</p>
          </div>
        </CardContent>
      </Card>

      {/* Total Expenses Card */}
      <Card className={`md:col-span-3 ${cardBase}`}>
        <CardContent className="p-6 flex flex-col h-full justify-center">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-xl bg-[var(--neg-bg)] flex items-center justify-center">
                <ArrowUpRight className="h-4 w-4 text-[var(--neg)]" />
              </div>
              <h3 className="text-[11px] font-bold text-[var(--neg)] tracking-wider uppercase">Total Expenses</h3>
            </div>
            <p className="font-sora text-2xl font-bold text-[var(--ink)]">₹{expenseFormatted}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
