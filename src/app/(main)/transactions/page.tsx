"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TransactionFilters } from "@/components/transaction/TransactionFilters"
import { TransactionTable } from "@/components/transaction/TransactionTable"
import { TransactionModal } from "@/components/common/TransactionModal"
import type { DateRange } from "react-day-picker"
import { startOfMonth, endOfMonth, format } from "date-fns"

type Transaction = {
  id: string
  amount: number
  type: "income" | "expense"
  description: string | null
  date: string
  category: { id: string; name: string; icon: string }
}

type Pagination = {
  page: number
  limit: number
  total: number
  hasNext: boolean
  hasPrev: boolean
}

const PAGE_SIZE = 7

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [type, setType] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [page, setPage] = useState(1)

  // Add transaction modal
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addModalType, setAddModalType] = useState<"income" | "expense">("expense")

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", String(PAGE_SIZE))
      if (type) params.set("type", type)
      if (categoryId) params.set("categoryId", categoryId)
      if (dateRange?.from) params.set("startDate", format(dateRange.from, "yyyy-MM-dd"))
      if (dateRange?.to) params.set("endDate", format(dateRange.to, "yyyy-MM-dd"))

      const res = await fetch(`/api/transactions?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setTransactions(data.data)
      setPagination(data.pagination)
    } catch {
      setTransactions([])
      setPagination(null)
    } finally {
      setIsLoading(false)
    }
  }, [page, type, categoryId, dateRange])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // When filters change, reset to page 1
  function handleTypeChange(t: string) {
    setType(t)
    setPage(1)
  }
  function handleCategoryChange(c: string) {
    setCategoryId(c)
    setPage(1)
  }
  function handleDateRangeChange(r: DateRange | undefined) {
    setDateRange(r)
    setPage(1)
  }

  return (
    <div className="space-y-4 p-6 max-w-6xl mx-auto">
      {/* Filter bar + Add button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <TransactionFilters
          type={type}
          categoryId={categoryId}
          dateRange={dateRange}
          onTypeChange={handleTypeChange}
          onCategoryChange={handleCategoryChange}
          onDateRangeChange={handleDateRangeChange}
        />

        <Button
          onClick={() => { setAddModalType("expense"); setAddModalOpen(true) }}
          className="bg-[#4338ca] hover:bg-[#3730a3] text-white rounded-lg px-5 shadow-sm shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Transaction
        </Button>
      </div>

      {/* Transaction table */}
      <TransactionTable
        transactions={transactions}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(p) => setPage(p)}
        onRefresh={fetchTransactions}
      />

      {/* Add Transaction Modal */}
      <TransactionModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        type={addModalType}
        onSuccess={() => { setAddModalOpen(false); fetchTransactions() }}
      />
    </div>
  )
}
