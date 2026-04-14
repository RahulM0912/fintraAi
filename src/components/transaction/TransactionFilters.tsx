"use client"

import { useEffect, useRef, useState } from "react"
import { CalendarIcon, ChevronDown, Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  format, parse, isValid,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
  subMonths, subDays,
} from "date-fns"
import type { DateRange } from "react-day-picker"

type Category = { id: string; name: string; icon: string; type: "income" | "expense" }

type Props = {
  type: string
  categoryId: string
  dateRange: DateRange | undefined
  onTypeChange: (type: string) => void
  onCategoryChange: (categoryId: string) => void
  onDateRangeChange: (range: DateRange | undefined) => void
}

// Tiny date-part input (month, day, year)
function DatePartInput({
  value,
  onChange,
  placeholder,
  maxLength,
  width,
  inputRef,
  onComplete,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  maxLength: number
  width: string
  inputRef?: React.Ref<HTMLInputElement>
  onComplete?: () => void
}) {
  return (
    <input
      ref={inputRef}
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "")
        onChange(v)
        if (v.length === maxLength) onComplete?.()
      }}
      className={`${width} text-center bg-transparent outline-none text-sm tabular-nums`}
    />
  )
}

// Controlled date input showing "M / D / YYYY"
function DateInput({
  date,
  onChange,
  nextRef,
}: {
  date: Date | undefined
  onChange: (d: Date | undefined) => void
  nextRef?: React.RefObject<HTMLInputElement>
}) {
  const [m, setM] = useState(date ? String(date.getMonth() + 1) : "")
  const [d, setD] = useState(date ? String(date.getDate()) : "")
  const [y, setY] = useState(date ? String(date.getFullYear()) : "")

  const dayRef = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLInputElement>(null)

  // Sync when external date changes (e.g. calendar click)
  useEffect(() => {
    if (date) {
      setM(String(date.getMonth() + 1))
      setD(String(date.getDate()))
      setY(String(date.getFullYear()))
    } else {
      setM(""); setD(""); setY("")
    }
  }, [date])

  // Try to parse and propagate whenever any part changes
  function tryParse(month: string, day: string, year: string) {
    if (month && day && year.length === 4) {
      const parsed = parse(`${month}/${day}/${year}`, "M/d/yyyy", new Date())
      if (isValid(parsed)) {
        onChange(parsed)
        return
      }
    }
    onChange(undefined)
  }

  return (
    <div className="flex items-center gap-0.5 border rounded-md px-2 py-1.5 text-sm focus-within:ring-1 focus-within:ring-ring bg-background">
      <DatePartInput
        value={m}
        onChange={(v) => { setM(v); tryParse(v, d, y) }}
        placeholder="M"
        maxLength={2}
        width="w-5"
        onComplete={() => dayRef.current?.focus()}
      />
      <span className="text-muted-foreground select-none">/</span>
      <DatePartInput
        value={d}
        onChange={(v) => { setD(v); tryParse(m, v, y) }}
        placeholder="D"
        maxLength={2}
        width="w-5"
        inputRef={dayRef}
        onComplete={() => yearRef.current?.focus()}
      />
      <span className="text-muted-foreground select-none">/</span>
      <DatePartInput
        value={y}
        onChange={(v) => { setY(v); tryParse(m, d, v) }}
        placeholder="YYYY"
        maxLength={4}
        width="w-10"
        inputRef={yearRef}
        onComplete={() => nextRef?.current?.focus()}
      />
    </div>
  )
}

export function TransactionFilters({
  type,
  categoryId,
  dateRange,
  onTypeChange,
  onCategoryChange,
  onDateRangeChange,
}: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [catSearch, setCatSearch] = useState("")
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(dateRange)
  const searchRef = useRef<HTMLInputElement>(null)
  const toMonthRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchAll() {
      try {
        const [incomeRes, expenseRes] = await Promise.all([
          fetch("/api/categories?type=income"),
          fetch("/api/categories?type=expense"),
        ])
        if (incomeRes.ok && expenseRes.ok) {
          const income = await incomeRes.json()
          const expense = await expenseRes.json()
          setCategories([
            ...income.map((c: any) => ({ ...c, type: "income" as const })),
            ...expense.map((c: any) => ({ ...c, type: "expense" as const })),
          ])
        }
      } catch {}
    }
    fetchAll()
  }, [])

  // Sync pending range when calendar opens
  useEffect(() => {
    if (calendarOpen) setPendingRange(dateRange)
  }, [calendarOpen])

  // Auto-focus search when category popover opens
  useEffect(() => {
    if (categoryOpen) {
      setCatSearch("")
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [categoryOpen])

  const filteredCategories = catSearch.trim()
    ? categories.filter((c) => c.name.toLowerCase().startsWith(catSearch.toLowerCase()))
    : categories

  const selectedCategory = categories.find((c) => c.id === categoryId)
  const categoryLabel = selectedCategory
    ? `${selectedCategory.icon} ${selectedCategory.name}`
    : "All Categories"

  const typeLabel =
    type === "income" ? "Income" : type === "expense" ? "Expense" : "Transaction Type"

  const dateLabel =
    dateRange?.from
      ? dateRange.to
        ? `${format(dateRange.from, "MMM dd, yyyy")} – ${format(dateRange.to, "MMM dd, yyyy")}`
        : format(dateRange.from, "MMM dd, yyyy")
      : "Select date range"

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Category Filter */}
      <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-1.5 text-sm h-9 font-normal">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {categoryLabel}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              ref={searchRef}
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              placeholder="Search categories…"
              className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="max-h-60 overflow-y-scroll" onWheel={(e) => e.stopPropagation()}>
            {!catSearch && (
              <button
                onClick={() => { onCategoryChange(""); setCategoryOpen(false) }}
                className={`w-full text-left text-sm px-3 py-2 rounded-md hover:bg-muted transition-colors ${!categoryId ? "bg-muted font-medium" : ""}`}
              >
                All Categories
              </button>
            )}
            {filteredCategories.length === 0 && (
              <p className="text-sm text-muted-foreground px-3 py-2">No results</p>
            )}
            {["income", "expense"].map((grp) => {
              const group = filteredCategories.filter((c) => c.type === grp)
              if (group.length === 0) return null
              return (
                <div key={grp}>
                  <div className="text-xs text-muted-foreground px-3 pt-2 pb-1 font-semibold uppercase tracking-wider">
                    {grp}
                  </div>
                  {group.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { onCategoryChange(cat.id); setCategoryOpen(false) }}
                      className={`w-full text-left text-sm px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center gap-2 ${categoryId === cat.id ? "bg-muted font-medium" : ""}`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Type Filter */}
      <Popover open={typeOpen} onOpenChange={setTypeOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-1.5 text-sm h-9 font-normal">
            {typeLabel}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1.5" align="start">
          {(["", "income", "expense"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { onTypeChange(t); setTypeOpen(false) }}
              className={`w-full text-left text-sm px-3 py-2 rounded-md hover:bg-muted transition-colors ${type === t ? "bg-muted font-medium" : ""}`}
            >
              {t === "" ? "All Types" : t === "income" ? "Income" : "Expense"}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Date Range */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-1.5 text-sm h-9 font-normal">
            <CalendarIcon className="h-3.5 w-3.5" />
            {dateLabel}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" sideOffset={6}>
          {/* Date inputs row */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <DateInput
              date={pendingRange?.from}
              onChange={(d) => setPendingRange((prev) => ({ from: d, to: prev?.to }))}
              nextRef={toMonthRef}
            />
            <span className="text-muted-foreground font-medium">–</span>
            <DateInput
              date={pendingRange?.to}
              onChange={(d) => setPendingRange((prev) => ({ from: prev?.from, to: d }))}
            />
          </div>

          {/* Calendar */}
          <div className="px-3 pb-2">
            <Calendar
              mode="range"
              selected={pendingRange}
              onSelect={setPendingRange}
              numberOfMonths={2}
            />
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2.5 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPendingRange(undefined)
                onDateRangeChange(undefined)
                setCalendarOpen(false)
              }}
            >
              Clear
            </Button>
            <Button
              size="sm"
              disabled={!pendingRange?.from || !pendingRange?.to}
              onClick={() => {
                onDateRangeChange(pendingRange)
                setCalendarOpen(false)
              }}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
