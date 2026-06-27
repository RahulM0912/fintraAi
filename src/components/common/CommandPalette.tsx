"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  Search,
  CornerDownLeft,
  LayoutGrid,
  CreditCard,
  MessageSquare,
  Settings,
  ArrowUpCircle,
  ArrowDownCircle,
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

function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`
}

export function CommandPalette({ open, onOpenChange, onQuickAdd }: Props) {
  const router = useRouter()
  const [q, setQ] = useState("")

  useEffect(() => {
    if (!open) setQ("")
  }, [open])

  const parsed = useMemo(() => parseQuickAdd(q), [q])
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

  const commitQuickAdd = () => {
    if (!parsed) return
    onQuickAdd(parsed.type, { amount: parsed.amount, description: parsed.description })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[15%] translate-y-0 max-w-[calc(100%-2rem)] sm:max-w-xl p-0 gap-0 overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--hairline)]"
      >
        <DialogTitle className="sr-only">Command palette and quick add</DialogTitle>

        {/* Input */}
        <div className="flex items-center gap-3 border-b border-[var(--hairline)] px-4 py-3.5">
          <Search className="h-4.5 w-4.5 shrink-0 text-[var(--ink-3)]" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && parsed) {
                e.preventDefault()
                commitQuickAdd()
              }
            }}
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
              className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] px-3 py-3 text-left transition-colors"
            >
              {parsed.type === "income" ? (
                <ArrowUpCircle className="h-5 w-5 shrink-0 text-[var(--pos)]" />
              ) : (
                <ArrowDownCircle className="h-5 w-5 shrink-0 text-[var(--neg)]" />
              )}
              <span className="flex-1 text-sm text-[var(--ink)]">
                Add {parsed.type}{" "}
                <span className="font-semibold">{formatINR(parsed.amount)}</span>
                {parsed.description ? (
                  <span className="text-[var(--ink-2)]"> · {parsed.description}</span>
                ) : null}
              </span>
              <span className="flex items-center gap-1 text-xs text-[var(--ink-3)]">
                <CornerDownLeft className="h-3.5 w-3.5" /> Enter
              </span>
            </button>
          )}

          {showLists && (
            <>
              {actions.length > 0 && (
                <Section label="Quick actions">
                  {actions.map((item) => (
                    <Row key={item.label} icon={item.icon} label={item.label} onClick={item.run} />
                  ))}
                </Section>
              )}
              {nav.length > 0 && (
                <Section label="Navigate">
                  {nav.map((item) => (
                    <Row key={item.label} icon={item.icon} label={item.label} onClick={item.run} />
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
              Tip: prefix <span className="font-medium text-[var(--ink-2)]">+</span> for income (e.g. +5000 salary).
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
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface-2)]"
    >
      <Icon className="h-4 w-4 shrink-0 text-[var(--ink-3)]" />
      {label}
    </button>
  )
}
