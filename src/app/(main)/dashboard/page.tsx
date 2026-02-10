"use client"

import { useEffect } from "react"
import TransactionButtonGroup from "@/components/common/TransactionButtonGroup"
import { useTransactionStore } from "@/store/transactionStore"

// import { useDashboardStore } from "@/stores/dashboard/dashboard.store"

// later you’ll import real components
// import SummaryCards from "./components/SummaryCards"
// import CategoryBreakdown from "./components/CategoryBreakdown"
// import HistoryChart from "./components/HistoryChart"

export default function Dashboard() {
  // const loadSummary = useDashboardStore((s) => s.loadSummary)
  // const loadHistory = useDashboardStore((s) => s.loadHistory)

  const { fetchAllCategories } = useTransactionStore()

  // initial load
  useEffect(() => {
    // loadSummary("2026-01-01", "2026-01-28")
    // loadHistory()
    fetchAllCategories();
  }, [fetchAllCategories])

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Hello, Rahul! 👋
        </h1>

        {/* New income / New expense buttons + modal */}
        <TransactionButtonGroup />
      </div>

      {/* Overview */}
      <section>
        <h2 className="text-xl mb-4">Overview</h2>

        {/* later */}
        {/* <SummaryCards /> */}
      </section>

      {/* Category Breakdown */}
      <section>
        {/* <CategoryBreakdown /> */}
      </section>

      {/* History */}
      <section>
        {/* <HistoryChart /> */}
      </section>

    </div>
  )
}
