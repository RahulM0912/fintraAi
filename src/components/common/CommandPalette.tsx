"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useTransactionStore, type CategoryState } from "@/store/transactionStore"
import { postAddToast, rememberLastCategory } from "@/lib/quickAdd"
import {
  Search,
  CornerDownLeft,
  LayoutGrid,
  CreditCard,
  MessageSquare,
  Settings,
  ArrowUpCircle,
  ArrowDownCircle,
  Tag,
} from "lucide-react"

type QuickAddType = "income" | "expense"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onQuickAdd: (
    type?: QuickAddType,
    prefill?: { amount?: number; description?: string }
  ) => void
}

type Parsed = { type: QuickAddType; amount: number; description?: string }

// "200 coffee" → expense 200 "coffee" · "+5000 salary" → income · "₹1,200 rent"
function parseQuickAdd(raw: string): Parsed | null {
  const s = raw.trim()
  if (!s) return null
  const m = s.match(/^([+-])?\s*₹?\s*([\d,]+(?:\.\d+)?)\s*(.*)$/)
  if (!m) return null
  const amount = parseFloat(m[2].replace(/,/g, ""))
  if (!amount || Number.isNaN(amount)) return null
  return {
    type: m[1] === "+" ? "income" : "expense",
    amount,
    description: m[3].trim() || undefined,
  }
}

// Try to resolve a category from the typed words ("500 food" → Food and
// drinks). Word-prefix match either way, ≥3 chars, so "grocery" hits
// "Groceries" but stray short words don't. The matched word leaves the
// description; the rest stays. Purely client-side — instant, no LLM.
function matchCategory(
  description: string | undefined,
  categories: CategoryState[]
): { category: CategoryState; rest?: string } | null {
  if (!description) return null
  const tokens = description.toLowerCase().split(/\s+/).filter(Boolean)
  for (const category of categories) {
    const words = category.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3)
    for (const token of tokens) {
      if (token.length < 3) continue
      if (words.some((w) => w === token || w.startsWith(token) || token.startsWith(w))) {
        const rest = tokens.filter((t) => t !== token).join(" ")
        return { category, rest: rest || undefined }
      }
    }
  }
  return null
}

function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`
}

export function CommandPalette({ open, onOpenChange, onQuickAdd }: Props) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLogging, setIsLogging] = useState(false)

  const {
    incomeCategories,
    expenseCategories,
    getIncomeCategories,
    getExpenseCategories,
    addTransaction,
  } = useTransactionStore()

  useEffect(() => {
    if (!open) {
      setQ("")
      setIsLogging(false)
      return
    }
    // Categories power the direct-log match below; cached after first load.
    getIncomeCategories().catch(() => {})
    getExpenseCategories().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const parsed = useMemo(() => parseQuickAdd(q), [q])
  // When the words name a category, Enter logs straight from the palette —
  // Ctrl+K → "500 food" → Enter, done. Otherwise Enter opens the form.
  const matched = useMemo(
    () =>
      parsed
        ? matchCategory(
            parsed.description,
            parsed.type === "income" ? incomeCategories : expenseCategories
          )
        : null,
    [parsed, incomeCategories, expenseCategories]
  )
  const filter = q.trim().toLowerCase()

  const go = (href: string) => {
    router.push(href)
    onOpenChange(false)
  }

  const navItems = [
    { label: "Go to Dashboard", icon: LayoutGrid, run: () => go("/dashboard") },
    { label: "Go to Transactions", icon: CreditCard, run: () => go("/transactions") },
    { label: "Go to Chat", icon: MessageSquare, run: () => go("/chat") },
    { label: "Go to Settings", icon: Settings, run: () => go("/settings") },
  ]

  const actionItems = [
    { label: "New expense", icon: ArrowDownCircle, run: () => onQuickAdd("expense") },
    { label: "New income", icon: ArrowUpCircle, run: () => onQuickAdd("income") },
  ]

  // When the user has typed a parseable amount, hide the static lists and let
  // Enter commit the quick-add. Otherwise filter the command lists by text.
  const showLists = !parsed
  const nav = navItems.filter((i) => i.label.toLowerCase().includes(filter))
  const actions = actionItems.filter((i) => i.label.toLowerCase().includes(filter))
  // Flat list in render order (actions first) for arrow-key navigation
  const flatItems = [...actions, ...nav]

  useEffect(() => {
    setActiveIndex(0)
  }, [q, open])

  const commitQuickAdd = async () => {
    if (!parsed || isLogging) return

    // No category resolved — hand off to the form, prefilled.
    if (!matched) {
      onQuickAdd(parsed.type, { amount: parsed.amount, description: parsed.description })
      return
    }

    // Category resolved — log it right here, today's date.
    setIsLogging(true)
    const created = await addTransaction(parsed.type, {
      amount: parsed.amount,
      categoryId: matched.category.id,
      description: matched.rest,
      date: format(new Date(), "yyyy-MM-dd"),
    })
    setIsLogging(false)

    if (created) {
      rememberLastCategory(parsed.type, String(matched.category.id))
      postAddToast({
        id: created.id,
        amount: parsed.amount,
        type: parsed.type,
        categoryId: String(matched.category.id),
        categoryName: matched.category.name,
      })
      window.dispatchEvent(new Event("transaction-added"))
      onOpenChange(false)
    } else {
      // API refused — fall back to the form so nothing typed is lost.
      onQuickAdd(parsed.type, { amount: parsed.amount, description: parsed.description })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (parsed) commitQuickAdd()
      else flatItems[activeIndex]?.run()
    } else if (e.key === "ArrowDown" && flatItems.length > 0) {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % flatItems.length)
    } else if (e.key === "ArrowUp" && flatItems.length > 0) {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[15%] translate-y-0 max-w-[calc(100%-2rem)] sm:max-w-xl p-0 gap-0 overflow-hidden rounded-xl bg-[var(--surface)] border border-[var(--hairline)]"
      >
        <DialogTitle className="sr-only">Command palette and quick add</DialogTitle>

        {/* Input */}
        <div className="flex items-center gap-3 border-b border-[var(--hairline)] px-4 py-3.5">
          <Search className="h-4.5 w-4.5 shrink-0 text-[var(--ink-3)]" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type an amount to add, or search…  e.g. 200 coffee"
            className="flex-1 bg-transparent text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-3)] outline-none"
          />
          <kbd className="hidden sm:inline-block rounded border border-[var(--hairline)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink-3)]">
            Esc
          </kbd>
        </div>

        <div className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          {/* Quick-add preview row */}
          {parsed && (
            <button
              onClick={commitQuickAdd}
              disabled={isLogging}
              className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] px-3 py-3 text-left transition-colors disabled:opacity-60"
            >
              {parsed.type === "income" ? (
                <ArrowUpCircle className="h-5 w-5 shrink-0 text-[var(--pos)]" />
              ) : (
                <ArrowDownCircle className="h-5 w-5 shrink-0 text-[var(--neg)]" />
              )}
              <span className="flex-1 text-sm text-[var(--ink)]">
                Add {parsed.type}{" "}
                <span className="font-semibold">{formatINR(parsed.amount)}</span>
                {matched?.rest && (
                  <span className="text-[var(--ink-2)]"> · {matched.rest}</span>
                )}
                {!matched && parsed.description ? (
                  <span className="text-[var(--ink-2)]"> · {parsed.description}</span>
                ) : null}
                {matched && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded border border-[var(--hairline-strong)] px-1.5 py-0.5 text-xs text-[var(--ink-2)]">
                    <Tag className="h-3 w-3" aria-hidden />
                    {matched.category.name}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1 text-xs text-[var(--ink-3)]">
                <CornerDownLeft className="h-3.5 w-3.5" />
                {isLogging ? "Logging…" : matched ? "Enter to log" : "Enter to open form"}
              </span>
            </button>
          )}

          {showLists && (
            <>
              {actions.length > 0 && (
                <Section label="Quick actions">
                  {actions.map((item, i) => (
                    <Row
                      key={item.label}
                      icon={item.icon}
                      label={item.label}
                      onClick={item.run}
                      active={activeIndex === i}
                      onHover={() => setActiveIndex(i)}
                    />
                  ))}
                </Section>
              )}
              {nav.length > 0 && (
                <Section label="Navigate">
                  {nav.map((item, i) => (
                    <Row
                      key={item.label}
                      icon={item.icon}
                      label={item.label}
                      onClick={item.run}
                      active={activeIndex === actions.length + i}
                      onHover={() => setActiveIndex(actions.length + i)}
                    />
                  ))}
                </Section>
              )}
              {actions.length === 0 && nav.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-[var(--ink-3)]">
                  No matches. Type an amount like <span className="font-medium text-[var(--ink-2)]">200 coffee</span> to add it.
                </p>
              )}
            </>
          )}

          {parsed && (
            <p className="px-3 pt-2 pb-1 text-[11px] text-[var(--ink-3)]">
              Tip: name a category to log instantly (e.g. 500 food) · prefix{" "}
              <span className="font-medium text-[var(--ink-2)]">+</span> for income (+5000 salary).
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">
        {label}
      </p>
      {children}
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  onClick,
  active,
  onHover,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  active: boolean
  onHover: () => void
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--ink)] transition-colors ${
        active ? "bg-[var(--surface-2)]" : ""
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 text-[var(--ink-3)]" />
      <span className="flex-1">{label}</span>
      {active && <CornerDownLeft className="h-3.5 w-3.5 text-[var(--ink-3)]" />}
    </button>
  )
}
