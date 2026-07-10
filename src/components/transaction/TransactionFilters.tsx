"use client"

import { useEffect, useState } from "react"
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { PickerList } from "@/components/ui/picker-list"
import { format, startOfMonth, endOfMonth } from "date-fns"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"

type Category = { id: string; name: string; icon: string; type: "income" | "expense" }

type Props = {
  type: string
  categoryId: string
  dateRange: DateRange | undefined
  search: string
  onTypeChange: (type: string) => void
  onCategoryChange: (categoryId: string) => void
  onDateRangeChange: (range: DateRange | undefined) => void
  onSearchChange: (search: string) => void
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
          className="cursor-pointer h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Previous year"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">{viewYear}</span>
        <button
          onClick={() => setViewYear((y) => y + 1)}
          disabled={viewYear >= now.getFullYear()}
          className="cursor-pointer h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                "cursor-pointer py-2.5 text-sm font-medium transition-all duration-100",
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
  type, categoryId, dateRange, search,
  onTypeChange, onCategoryChange, onDateRangeChange, onSearchChange,
}: Props) {
  const [categories, setCategories]     = useState<Category[]>([])
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [typeOpen, setTypeOpen]         = useState(false)

  // Local echo of the search text so typing feels instant; the parent (and the
  // network request behind it) only hears about it after a debounce.
  const [searchText, setSearchText] = useState(search)
  useEffect(() => { setSearchText(search) }, [search])
  useEffect(() => {
    if (searchText === search) return
    const t = setTimeout(() => onSearchChange(searchText), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText])

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

  const selectedCategory = categories.find((c) => c.id === categoryId)
  const categoryLabel    = selectedCategory ? selectedCategory.name : "All categories"
  const typeLabel        = type === "income" ? "Income" : type === "expense" ? "Expense" : "All types"
  const dateLabel        = buildDateLabel(dateRange)

  return (
    <div className="flex items-center gap-2 flex-wrap">

      {/* Description search */}
      <div className="relative flex-1 min-w-[160px] sm:flex-none sm:w-56">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search description…"
          aria-label="Search transactions by description"
          className="h-11 w-full rounded-lg border border-input bg-transparent pl-9 pr-8 text-sm outline-none transition-colors duration-150 focus:ring-2 focus:ring-ring/50"
        />
        {searchText && (
          <button
            onClick={() => { setSearchText(""); onSearchChange("") }}
            aria-label="Clear search"
            className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Category Filter */}
      <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-1.5 text-sm h-11 rounded-lg font-normal">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {categoryLabel}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <PickerList
            searchable
            searchPlaceholder="Search categories…"
            maxHeightClass="max-h-60"
            options={[
              { key: "", label: "All categories" },
              ...(["income", "expense"] as const).flatMap((grp) =>
                categories
                  .filter((c) => c.type === grp)
                  .map((c) => ({ key: c.id, label: c.name, group: grp }))
              ),
            ]}
            value={categoryId}
            onSelect={(key) => {
              onCategoryChange(key)
              setCategoryOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>

      {/* Type Filter */}
      <Popover open={typeOpen} onOpenChange={setTypeOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-1.5 text-sm h-11 rounded-lg font-normal">
            {typeLabel}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1.5" align="start">
          <PickerList
            options={[
              { key: "", label: "All types" },
              { key: "income", label: "Income" },
              { key: "expense", label: "Expense" },
            ]}
            value={type}
            onSelect={(key) => {
              onTypeChange(key)
              setTypeOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>

      {/* Month-range picker — unified for all screen sizes */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-1.5 text-sm h-11 rounded-lg font-normal">
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
