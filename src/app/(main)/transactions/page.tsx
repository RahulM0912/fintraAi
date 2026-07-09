"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TransactionFilters } from "@/components/transaction/TransactionFilters"
import { TransactionTable } from "@/components/transaction/TransactionTable"
import { useQuickAdd } from "@/components/common/QuickAddProvider"
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
  const { openAdd } = useQuickAdd()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [type, setType] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [search, setSearch] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [page, setPage] = useState(1)

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", String(PAGE_SIZE))
      if (type) params.set("type", type)
      if (categoryId) params.set("categoryId", categoryId)
      if (search) params.set("search", search)
      if (dateRange?.from) params.set("startDate", format(dateRange.from, "yyyy-MM-dd"))
      if (dateRange?.to) params.set("endDate", format(dateRange.to, "yyyy-MM-dd"))

      const res = await fetch(`/api/transactions?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      // If a delete/filter emptied the current page but earlier pages still have
      // rows, step back instead of stranding the user on a blank page.
      if ((data.data?.length ?? 0) === 0 && (data.pagination?.total ?? 0) > 0 && page > 1) {
        setPage((p) => Math.max(1, p - 1))
        return
      }
      setTransactions(data.data)
      setPagination(data.pagination)
    } catch {
      setTransactions([])
      setPagination(null)
    } finally {
      setIsLoading(false)
    }
  }, [page, type, categoryId, search, dateRange])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Refresh when a transaction is added elsewhere (quick-add palette, bottom-nav, AI)
  useEffect(() => {
    const handler = () => fetchTransactions()
    window.addEventListener("transaction-added", handler)
    return () => window.removeEventListener("transaction-added", handler)
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
  function handleSearchChange(s: string) {
    setSearch(s)
    setPage(1)
  }

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Page title — mobile gets it from the app header; add via bottom-nav "+" */}
      <div className="hidden lg:flex items-end justify-between gap-4">
        <div>
          <h1 className="font-sora text-[26px] font-bold tracking-tight text-[var(--ink)]">Transactions</h1>
          <p className="text-sm text-[var(--ink-2)] mt-0.5">Search, filter, and manage your records.</p>
        </div>
        <Button
          onClick={() => openAdd("expense")}
          className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white rounded-lg px-5 shadow-sm transition-colors duration-200 shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Transaction
        </Button>
      </div>

      {/* Filter bar */}
      <TransactionFilters
        type={type}
        categoryId={categoryId}
        dateRange={dateRange}
        search={search}
        onTypeChange={handleTypeChange}
        onCategoryChange={handleCategoryChange}
        onDateRangeChange={handleDateRangeChange}
        onSearchChange={handleSearchChange}
      />

      {/* Transaction table — global quick-add modal fires "transaction-added",
          which the effect above listens to, so creates refresh this list */}
      <TransactionTable
        transactions={transactions}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(p) => setPage(p)}
        onRefresh={fetchTransactions}
      />
    </div>
  )
}
