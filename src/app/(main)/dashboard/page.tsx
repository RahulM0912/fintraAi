"use client"

import React, { useEffect } from "react"
import { Plus } from "lucide-react"
import { useQuickAdd } from "@/components/common/QuickAddProvider"
import { useTransactionStore } from "@/store/transactionStore"
import { useDashboardStore } from "@/store/dashboardStore"
import { AgentBriefing } from "@/components/dashboard/AgentBriefing"
import SummaryCard from "@/components/dashboard/SummaryCard"
import { RecentTransactionsCard } from "@/components/dashboard/RecentTransactionsCard"
import { MonthlyReportCard } from "@/components/dashboard/MonthlyReportCard"
import { BudgetCard } from "@/components/dashboard/BudgetCard"
import { TrendCard } from "@/components/dashboard/TrendCard"

export default function Dashboard() {
  const { fetchAllCategories } = useTransactionStore()
  const { fetchDashboard } = useDashboardStore()
  const { openAdd } = useQuickAdd()

  // One request hydrates every section (stale-while-revalidate: cached data
  // paints instantly on revisit, refresh runs in the background). This is the
  // only place the dashboard fetches or listens — sections just read the store.
  useEffect(() => {
    fetchAllCategories();
    fetchDashboard();

    const refresh = () => fetchDashboard();
    window.addEventListener("transaction-added", refresh);
    return () => window.removeEventListener("transaction-added", refresh);
  }, [fetchAllCategories, fetchDashboard]);

  return (
    <div className="mx-auto max-w-5xl px-5 pt-6 pb-10 sm:px-8 lg:pt-12 lg:pb-16">
      <h1 className="sr-only">Dashboard</h1>

      {/* The hero: the agent's briefing. Everything below is evidence. */}
      <div className="relative">
        <AgentBriefing />
        {/* Desktop add affordance; mobile uses the bottom-nav "+" */}
        <button
          onClick={() => openAdd("expense")}
          className="cursor-pointer absolute right-0 top-0 hidden min-h-11 items-center gap-2 rounded-lg border border-[var(--hairline-strong)] px-4 text-sm font-medium text-[var(--ink-2)] transition-colors duration-150 ease-out hover:border-[var(--ink-3)] hover:text-[var(--ink)] lg:inline-flex"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add transaction
        </button>
      </div>

      {/* The month's raw numbers, typeset */}
      <div className="mt-12 lg:mt-16">
        <SummaryCard />
      </div>

      {/* Supporting evidence, flat sections on a hairline grid */}
      <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-12 lg:mt-16 lg:grid-cols-3">
        <div className="space-y-12 lg:col-span-2">
          <TrendCard />
          <RecentTransactionsCard />
        </div>
        {/* Right rail. The absolute inner wrapper removes the rail from the
            grid row's height computation, so the row is sized by the left
            column alone and the rail's lists must scroll inside that height —
            the rail can never run past Recent activity. Mobile keeps normal
            flow with fixed list caps. */}
        <div className="relative">
          <div className="flex flex-col gap-12 lg:absolute lg:inset-0">
            <MonthlyReportCard />
            <BudgetCard />
          </div>
        </div>
      </div>
    </div>
  )
}
