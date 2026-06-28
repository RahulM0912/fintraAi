"use client"

import React, { useEffect } from "react"
import TransactionButtonGroup from "@/components/common/TransactionButtonGroup"
import { useTransactionStore } from "@/store/transactionStore"
import { useDashboardStore } from "@/store/dashboardStore"
import SummaryCard from "@/components/dashboard/SummaryCard"
import { RecentTransactionsCard } from "@/components/dashboard/RecentTransactionsCard"
import { MonthlyReportCard } from "@/components/dashboard/MonthlyReportCard"
import { BudgetCard } from "@/components/dashboard/BudgetCard"
import { TrendCard } from "@/components/dashboard/TrendCard"
import { InsightCard } from "@/components/dashboard/InsightCard"

export default function Dashboard() {
  const { fetchAllCategories } = useTransactionStore()
  const { fetchSummary } = useDashboardStore()

  useEffect(() => {
    fetchAllCategories();
    
    const fetchGlobalSummary = () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      fetchSummary(start.toISOString(), end.toISOString());
    };
    
    fetchGlobalSummary();

    window.addEventListener("transaction-added", fetchGlobalSummary);
    return () => window.removeEventListener("transaction-added", fetchGlobalSummary);
  }, [fetchAllCategories, fetchSummary]);

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto min-h-full pb-16">
      <section>
        <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
          <div>
            <h1 className="font-sora text-[26px] font-bold tracking-tight text-[var(--ink)]">Overview</h1>
            <p className="text-sm text-[var(--ink-2)] mt-0.5">Here&apos;s where your money stands this month.</p>
          </div>
          <TransactionButtonGroup />
        </div>
        <SummaryCard />
      </section>

      <InsightCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TrendCard />
          <RecentTransactionsCard />
          <BudgetCard />
        </div>
        <div className="lg:col-span-1">
          <MonthlyReportCard />
        </div>
      </div>
    </div>
  )
}

