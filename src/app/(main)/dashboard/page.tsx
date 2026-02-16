"use client"

import React, { useEffect, useState } from "react"
import TransactionButtonGroup from "@/components/common/TransactionButtonGroup"
import { useTransactionStore } from "@/store/transactionStore"
import { useDashboardStore } from "@/store/dashboardStore"
import { DatePickerWithRange } from "@/components/dashboard/dataPickerWithRange"
import { DateRange } from "react-day-picker"
import SummaryCard from "@/components/dashboard/SummaryCard"
import { HistoryCard } from "@/components/dashboard/HistoryCard"

export default function Dashboard() {
  const today = new Date()
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(today.getFullYear(), today.getMonth(), 1),
    to: today
  })
 

  const { fetchAllCategories } = useTransactionStore()
  const { fetchSummary } = useDashboardStore()

  // initial load
  useEffect(() => {
    // loadHistory()
    fetchAllCategories();
    fetchSummary(date?.from?.toISOString() || "", date?.to?.toISOString() || "");
  }, [fetchAllCategories, fetchSummary, date]);

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
        <div className="flex items-center justify-between">
          <h1 className="text-xl mb-4">Overview</h1>
          <div>
            <DatePickerWithRange date={date} setDate={setDate} />
          </div>
        </div>
          <SummaryCard />
      </section>

      {/* History */}
      <section>
        <h1 className="text-xl mb-4">History</h1>
        <HistoryCard />
      </section>

    </div>
  )
}

