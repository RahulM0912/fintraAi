"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, setMonth, setYear } from "date-fns";

/* Category breakdown as a ranked bar list — one evergreen hue in tint
   steps (--chart-1..5), category names as direct labels. Replaces the
   twin pie charts. */

interface CategoryRow {
  name: string;
  value: number; // share of total, %
  amount: number;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function MonthlyReportCard() {
  const [selectedChart, setSelectedChart] = useState<'expense' | 'income'>('expense');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<{incomeByCategory: any[], expenseByCategory: any[], total: any}>({
    incomeByCategory: [], expenseByCategory: [], total: { totalIncome: 0, totalExpense: 0, netBalance: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const now = new Date();
  // Reports only exist up to the current month — block navigating into the future.
  const canGoNext =
    currentDate.getFullYear() < now.getFullYear() ||
    (currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() < now.getMonth());

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => {
    if (canGoNext) setCurrentDate(addMonths(currentDate, 1));
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchMonthlyData = () => {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      setIsLoading(true);
      fetch(`/api/summary?startDate=${start.toISOString()}&endDate=${end.toISOString()}&_t=${Date.now()}`, { cache: 'no-store' })
        .then(res => {
          if (!res.ok) throw new Error(`${res.status}`);
          return res.json();
        })
        .then(data => setReportData(data))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    };

    fetchMonthlyData();

    window.addEventListener("transaction-added", fetchMonthlyData);
    return () => window.removeEventListener("transaction-added", fetchMonthlyData);
  }, [currentDate, mounted]);

  const rows: CategoryRow[] = useMemo(() => {
    const src = selectedChart === 'expense' ? reportData.expenseByCategory : reportData.incomeByCategory;
    return (src || [])
      .map((cat: any) => ({
        name: cat.name,
        value: Number(cat.percentage) || 0,
        amount: Number(cat.totalAmount) || 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [reportData, selectedChart]);

  const total = selectedChart === 'expense'
    ? reportData.total.totalExpense || 0
    : reportData.total.totalIncome || 0;

  if (isLoading) {
    return (
      <section className="border-t border-[var(--hairline)] pt-6">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-40" />
        <div className="mt-6 space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="mb-2 flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Monthly category breakdown" className="border-t border-[var(--hairline)] pt-6">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
          Where it went
        </h2>

        {/* Month navigation */}
        <div className="flex items-center">
          <button
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="cursor-pointer flex h-11 w-8 items-center justify-center text-[var(--ink-3)] transition-colors duration-150 hover:text-[var(--ink)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <Popover open={pickerOpen} onOpenChange={(o) => {
            setPickerOpen(o)
            if (o) setPickerYear(currentDate.getFullYear())
          }}>
            <PopoverTrigger asChild>
              <button className="cursor-pointer min-h-11 rounded px-1 text-[13px] font-medium text-[var(--ink-2)] transition-colors duration-150 hover:text-[var(--ink)]">
                {mounted ? format(currentDate, 'MMM yyyy') : '--'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="center">
              <div className="mb-3 flex items-center justify-between">
                <button
                  onClick={() => setPickerYear((y) => y - 1)}
                  aria-label="Previous year"
                  className="cursor-pointer rounded p-1 transition-colors hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <span className="text-sm font-semibold">{pickerYear}</span>
                <button
                  onClick={() => setPickerYear((y) => Math.min(now.getFullYear(), y + 1))}
                  disabled={pickerYear >= now.getFullYear()}
                  aria-label="Next year"
                  className="cursor-pointer rounded p-1 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {MONTHS.map((mon, i) => {
                  const isActive =
                    currentDate.getMonth() === i &&
                    currentDate.getFullYear() === pickerYear
                  const isFuture =
                    pickerYear > now.getFullYear() ||
                    (pickerYear === now.getFullYear() && i > now.getMonth())
                  return (
                    <button
                      key={mon}
                      disabled={isFuture}
                      onClick={() => {
                        setCurrentDate(setYear(setMonth(new Date(), i), pickerYear))
                        setPickerOpen(false)
                      }}
                      className={cn(
                        "cursor-pointer rounded-md py-1.5 text-xs font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted",
                        isFuture && "cursor-not-allowed opacity-30 hover:bg-transparent"
                      )}
                    >
                      {mon}
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>

          <button
            onClick={handleNextMonth}
            disabled={!canGoNext}
            aria-label="Next month"
            className="cursor-pointer flex h-11 w-8 items-center justify-center text-[var(--ink-3)] transition-colors duration-150 hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Spending / income toggle */}
      <div className="mb-5 flex items-center gap-1" role="group" aria-label="Breakdown type">
        {(['expense', 'income'] as const).map((kind) => (
          <button
            key={kind}
            onClick={() => setSelectedChart(kind)}
            aria-pressed={selectedChart === kind}
            className={cn(
              "cursor-pointer min-h-11 pr-4 text-[13px] transition-colors duration-150 ease-out",
              selectedChart === kind
                ? "font-semibold text-[var(--ink)] underline decoration-[var(--brand)] decoration-2 underline-offset-8"
                : "text-[var(--ink-3)] hover:text-[var(--ink)]"
            )}
          >
            {kind === 'expense' ? 'Spending' : 'Income'}
          </button>
        ))}
      </div>

      <p className="font-display tnum text-[28px] leading-none text-[var(--ink)]">
        ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(total)}
      </p>
      <p className="mt-1.5 text-[13px] text-[var(--ink-2)]">
        {rows.length > 0
          ? `across ${rows.length} ${rows.length === 1 ? 'category' : 'categories'}`
          : 'nothing recorded this month'}
      </p>

      <ul className="mt-6 space-y-5">
        {rows.map((category, i) => (
          <li key={category.name}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="truncate font-medium text-[var(--ink)]">{category.name}</span>
              <span className="tnum shrink-0 text-[var(--ink-2)]">
                ₹{(category.amount || 0).toLocaleString('en-IN')}
                <span className="pl-2 text-[var(--ink-3)]">{Math.round(category.value)}%</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full transition-[width] duration-200 ease-out"
                style={{
                  width: `${Math.max(Math.round(category.value), 2)}%`,
                  backgroundColor: `var(--chart-${Math.min(i + 1, 5)})`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
