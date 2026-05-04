"use client"

import { useEffect, useRef, useState } from "react"
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, startOfMonth, endOfMonth } from "date-fns"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"

type Category = { id: string; name: string; icon: string; type: "income" | "expense" }

type Props = {
  type: string
  categoryId: string
  dateRange: DateRange | undefined
  onTypeChange: (type: string) => void
  onCategoryChange: (categoryId: string) => void
  onDateRangeChange: (range: DateRange | undefined) => void
}

/* ── Helpers ─────────────────────────────────────────────────────── */
type MonthPoint = { year: number; month: number } // month is 0-indexed

function cmp(a: MonthPoint, b: MonthPoint) {
  return a.year !== b.year ? a.year - b.year : a.month - b.month
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

/* ── Month-range picker ──────────────────────────────────────────── */
function MonthRangePicker({
  value,
  onChange,
  onClose,
}: {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  onClose: () => void
}) {
  const now = new Date()
  const [viewYear, setViewYear]   = useState(value?.from?.getFullYear() ?? now.getFullYear())
  const [anchor, setAnchor]       = useState<MonthPoint | null>(null)
  const [hover, setHover]         = useState<MonthPoint | null>(null)

  // Reset anchor if external clear happens
  useEffect(() => { if (!value) setAnchor(null) }, [value])

  const fromPt: MonthPoint | null = value?.from
    ? { year: value.from.getFullYear(), month: value.from.getMonth() } : null
  const toPt: MonthPoint | null   = value?.to
    ? { year: value.to.getFullYear(),   month: value.to.getMonth()   } : null

  // While user is mid-selection, show preview based on anchor + hover
  const previewFrom = anchor && hover ? (cmp(anchor, hover) <= 0 ? anchor : hover) : null
  const previewTo   = anchor && hover ? (cmp(anchor, hover) <= 0 ? hover  : anchor) : null

  const dispFrom = previewFrom ?? fromPt
  const dispTo   = previewTo   ?? toPt

  function getState(p: MonthPoint) {
    const future = p.year > now.getFullYear() ||
      (p.year === now.getFullYear() && p.month > now.getMonth())
    if (future) return "disabled" as const

    // Anchor waiting for second click (no hover yet)
    if (anchor && !hover && cmp(p, anchor) === 0) return "anchor" as const

    const isStart = dispFrom && cmp(p, dispFrom) === 0
    const isEnd   = dispTo   && cmp(p, dispTo)   === 0
    if (isStart && isEnd)  return "single"   as const
    if (isStart)           return "start"    as const
    if (isEnd)             return "end"      as const
    if (dispFrom && dispTo && cmp(p, dispFrom) > 0 && cmp(p, dispTo) < 0)
                           return "in-range" as const
    return "default" as const
  }

  function handleClick(p: MonthPoint) {
    if (!anchor) {
      // First click — set anchor
      setAnchor(p)
      setHover(null)
    } else {
      // Second click — commit range
      const [start, end] = cmp(anchor, p) <= 0 ? [anchor, p] : [p, anchor]
      onChange({
        from: startOfMonth(new Date(start.year, start.month)),
        to:   endOfMonth(new Date(end.year,   end.month)),
      })
      setAnchor(null)
      setHover(null)
      onClose()
    }
  }

  return (
    <div
      className="p-4 w-72 select-none"
      onMouseLeave={() => setHover(null)}
    >
      {/* Year navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setViewYear((y) => y - 1)}
          className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Previous year"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">{viewYear}</span>
        <button
          onClick={() => setViewYear((y) => y + 1)}
          disabled={viewYear >= now.getFullYear()}
          className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
          aria-label="Next year"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Instruction hint */}
      <p className="text-[11px] text-center text-muted-foreground mb-3 h-4">
        {anchor ? "Now pick an end month" : "Pick a start month"}
      </p>

      {/* Month grid */}
      <div className="grid grid-cols-3 gap-1">
        {MONTH_LABELS.map((label, i) => {
          const p     = { year: viewYear, month: i }
          const state = getState(p)

          return (
            <button
              key={label}
              disabled={state === "disabled"}
              onClick={() => handleClick(p)}
              onMouseEnter={() => anchor && setHover(p)}
              className={cn(
                "py-2.5 text-sm font-medium transition-all duration-100",
                // End-caps get rounded corners; in-range cells get square sides
                state === "start"    && "rounded-l-lg bg-primary text-primary-foreground",
                state === "end"      && "rounded-r-lg bg-primary text-primary-foreground",
                state === "single"   && "rounded-lg  bg-primary text-primary-foreground",
                state === "anchor"   && "rounded-lg  bg-primary/80 text-primary-foreground ring-2 ring-primary/50 ring-offset-1",
                state === "in-range" && "rounded-none bg-primary/10 text-primary",
                state === "default"  && "rounded-lg hover:bg-muted",
                state === "disabled" && "rounded-lg opacity-25 cursor-not-allowed",
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {anchor ? "Click same month for single-month view" : ""}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            setAnchor(null)
            setHover(null)
            onChange(undefined)
            onClose()
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}

/* ── Trigger label helper ────────────────────────────────────────── */
function buildDateLabel(range: DateRange | undefined) {
  if (!range?.from) return "Select period"
  const from = range.from
  const to   = range.to

  if (!to) return format(from, "MMM yyyy")

  const sameYear  = from.getFullYear() === to.getFullYear()
  const sameMonth = sameYear && from.getMonth() === to.getMonth()

  if (sameMonth) return format(from, "MMM yyyy")
  if (sameYear)  return `${format(from, "MMM")} – ${format(to, "MMM yyyy")}`
  return `${format(from, "MMM yyyy")} – ${format(to, "MMM yyyy")}`
}

/* ── Main filter bar ─────────────────────────────────────────────── */
export function TransactionFilters({
  type, categoryId, dateRange,
  onTypeChange, onCategoryChange, onDateRangeChange,
}: Props) {
  const [categories, setCategories]     = useState<Category[]>([])
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [typeOpen, setTypeOpen]         = useState(false)
  const [catSearch, setCatSearch]       = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchAll() {
      try {
        const [incomeRes, expenseRes] = await Promise.all([
          fetch("/api/categories?type=income"),
          fetch("/api/categories?type=expense"),
        ])
        if (incomeRes.ok && expenseRes.ok) {
          const income  = await incomeRes.json()
          const expense = await expenseRes.json()
          setCategories([
            ...income.map((c: any)  => ({ ...c, type: "income"  as const })),
            ...expense.map((c: any) => ({ ...c, type: "expense" as const })),
          ])
        }
      } catch {}
    }
    fetchAll()
  }, [])

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
  const categoryLabel    = selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : "All Categories"
  const typeLabel        = type === "income" ? "Income" : type === "expense" ? "Expense" : "Transaction Type"
  const dateLabel        = buildDateLabel(dateRange)

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
                  <div className="text-xs text-muted-foreground px-3 pt-2 pb-1 font-semibold uppercase tracking-wider">{grp}</div>
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

      {/* Month-range picker — unified for all screen sizes */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-1.5 text-sm h-9 font-normal">
            <CalendarIcon className="h-3.5 w-3.5" />
            {dateLabel}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" sideOffset={6}>
          <MonthRangePicker
            value={dateRange}
            onChange={onDateRangeChange}
            onClose={() => setCalendarOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
