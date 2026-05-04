import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStore } from "@/store/dashboardStore";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

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

  const balanceParts = formatCurrencyParts(netBalance ?? 0);
  const incomeFormatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(totalIncome ?? 0);
  const expenseFormatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(totalExpense ?? 0);
  const currentMonthStr = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date()).toUpperCase();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        {/* Total Balance Skeleton */}
        <Card className="md:col-span-6 bg-white dark:bg-zinc-900 border-none shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2rem]">
          <CardContent className="p-8 h-full flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-10 w-48" />
          </CardContent>
        </Card>

        {/* Total Income Skeleton */}
        <Card className="md:col-span-3 bg-white dark:bg-zinc-900 border-none shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2rem]">
          <CardContent className="p-6 flex flex-col h-full justify-center">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>

        {/* Total Expenses Skeleton */}
        <Card className="md:col-span-3 bg-white dark:bg-zinc-900 border-none shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2rem]">
          <CardContent className="p-6 flex flex-col h-full justify-center">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-4 w-4 rounded" />
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
      {/* Total Balance Card (Larger) */}
      <Card className="md:col-span-6 bg-white dark:bg-zinc-900 border-none shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2rem] relative overflow-hidden">
        <CardContent className="p-8 h-full flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-[13px] font-medium text-gray-500">Total Balance</h3>
            <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-gray-50 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{currentMonthStr}</span>
          </div>
          <div className="flex items-baseline mt-2">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">₹{balanceParts.intPart}</span>
            <span className="text-xl font-bold text-gray-400">.{balanceParts.fracPart}</span>
          </div>
        </CardContent>
      </Card>

      {/* Total Income Card */}
      <Card className="md:col-span-3 bg-white dark:bg-zinc-900 border-none shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2rem] relative overflow-hidden">
        <CardContent className="p-6 flex flex-col h-full justify-center">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ArrowDownRight className="h-4 w-4 text-[#16a34a]" />
              <h3 className="text-[11px] font-bold text-[#16a34a] tracking-wider uppercase">Total Income</h3>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">₹{incomeFormatted}</p>
          </div>
        </CardContent>
      </Card>

      {/* Total Expenses Card */}
      <Card className="md:col-span-3 bg-white dark:bg-zinc-900 border-none shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2rem] relative overflow-hidden">
        <CardContent className="p-6 flex flex-col h-full justify-center">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpRight className="h-4 w-4 text-[#dc2626]" />
              <h3 className="text-[11px] font-bold text-[#dc2626] tracking-wider uppercase">Total Expenses</h3>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">₹{expenseFormatted}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
