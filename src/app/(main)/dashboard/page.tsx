"use client"

import React, { useEffect } from "react"
import TransactionButtonGroup from "@/components/common/TransactionButtonGroup"
import { useTransactionStore } from "@/store/transactionStore"
import { useDashboardStore } from "@/store/dashboardStore"
import SummaryCard from "@/components/dashboard/SummaryCard"
import { RecentTransactionsCard } from "@/components/dashboard/RecentTransactionsCard"
import { MonthlyReportCard } from "@/components/dashboard/MonthlyReportCard"

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
        <div className="flex items-center justify-between mb-4 gap-4">
          <h2 className="text-[22px] font-bold text-[#1f2937] dark:text-gray-100">Overview</h2>
          <TransactionButtonGroup />
        </div>
        <SummaryCard />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentTransactionsCard />
        </div>
        <div className="lg:col-span-1">
          <MonthlyReportCard />
        </div>
      </div>
    </div>
  )
}

