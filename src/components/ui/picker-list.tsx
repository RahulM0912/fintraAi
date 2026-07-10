"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search } from "lucide-react"

// ─── PickerList — the one option list behind every popover picker ───────────────
//
// Category/type pickers used to be four hand-rolled button stacks with no
// keyboard support and inconsistent scroll behavior inside dialogs. This is
// the shared listbox: optional search, ArrowUp/Down + Enter, highlighted row
// kept in view, and wheel events stopped so the dialog's scroll lock doesn't
// swallow list scrolling.

export interface PickerOption {
  key: string
  label: string
  /** Optional group header rendered when it changes between consecutive options. */
  group?: string
}

export function PickerList({
  options,
  value,
  onSelect,
  searchable = false,
  searchPlaceholder = "Search…",
  emptyText = "No results",
  maxHeightClass = "max-h-56",
}: {
  options: PickerOption[]
  value?: string | null
  onSelect: (key: string) => void
  searchable?: boolean
  searchPlaceholder?: string
  emptyText?: string
  maxHeightClass?: string
}) {
  const [search, setSearch] = useState("")
  const listRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options
  }, [options, search])

  // Start on the current value so Enter with no arrows re-picks it.
  const [highlight, setHighlight] = useState(() =>
    Math.max(0, filtered.findIndex((o) => o.key === value))
  )

  useEffect(() => setHighlight(0), [search])

  // Focus the search box when there is one; otherwise the list itself, so
  // arrow keys work immediately in both shapes. (Radix focuses the popover
  // content on open — this moves it one step further in.)
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchable) searchRef.current?.focus()
      else listRef.current?.focus()
    }, 50)
    return () => clearTimeout(t)
  }, [searchable])

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [highlight])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const option = filtered[highlight]
      if (option) onSelect(option.key)
    }
  }

  return (
    <div onKeyDown={handleKeyDown}>
      {searchable && (
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            role="combobox"
            aria-expanded="true"
            aria-controls="picker-listbox"
            className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      <div
        ref={listRef}
        id="picker-listbox"
        role="listbox"
        tabIndex={searchable ? -1 : 0}
        // The dialog's scroll lock swallows wheel events from portaled
        // popovers — stop them here so the list scrolls.
        onWheel={(e) => e.stopPropagation()}
        className={`${maxHeightClass} overflow-y-auto outline-none`}
      >
        {filtered.length === 0 && (
          <p className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</p>
        )}
        {filtered.map((option, i) => (
          <div key={option.key}>
            {option.group && option.group !== filtered[i - 1]?.group && (
              <div className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {option.group}
              </div>
            )}
            <button
              type="button"
              data-index={i}
              role="option"
              aria-selected={option.key === value}
              onClick={() => onSelect(option.key)}
              onMouseEnter={() => setHighlight(i)}
              className={`cursor-pointer flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                i === highlight ? "bg-muted" : ""
              } ${option.key === value ? "font-medium" : ""}`}
            >
              {option.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
