"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Target } from "lucide-react"
import { BudgetModal, type EditingBudget } from "@/components/dashboard/BudgetModal"

type BudgetItem = {
  id: string
  categoryId: string
  categoryName: string
  categoryIcon: string
  amount: number
  spent: number
  percentage: number
}

type BudgetData = {
  month: string
  overall: { id: string; amount: number; spent: number; percentage: number } | null
  items: BudgetItem[]
  totalExpense: number
}

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`
}

// Healthy under 80%, warning 80–99%, over at 100%+.
function barColor(pct: number) {
  if (pct >= 100) return "var(--neg)"
  if (pct >= 80) return "#f59e0b"
  return "var(--pos)"
}

export function BudgetCard() {
  const [data, setData] = useState<BudgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<EditingBudget | null>(null)

  const fetchBudgets = useCallback(async () => {
    try {
      const res = await fetch("/api/budgets")
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBudgets()
    const handler = () => fetchBudgets()
    window.addEventListener("transaction-added", handler)
    return () => window.removeEventListener("transaction-added", handler)
  }, [fetchBudgets])

  const openNew = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (b: EditingBudget) => {
    setEditing(b)
    setModalOpen(true)
  }

  const hasAny = !!data && (data.overall || data.items.length > 0)

  return (
    <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 sm:p-6 shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-[var(--ink-3)]" />
          <h2 className="font-sora text-base font-semibold text-[var(--ink)]">Budgets</h2>
        </div>
        <button
          onClick={openNew}
          className="cursor-pointer flex items-center gap-1.5 rounded-lg bg-[var(--brand-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add budget
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-[var(--surface-2)] animate-pulse" />
          ))}
        </div>
      ) : !hasAny ? (
        <div className="py-8 text-center">
          <p className="text-sm text-[var(--ink-2)]">No budgets yet.</p>
          <p className="text-xs text-[var(--ink-3)] mt-1">
            Set a monthly cap to see how much you can still spend.
          </p>
          <button
            onClick={openNew}
            className="cursor-pointer mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-hover)] transition-colors"
          >
            <Plus className="h-4 w-4" /> Set your first budget
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {data!.overall && (
            <BudgetRow
              label="Overall"
              icon="💰"
              spent={data!.overall.spent}
              amount={data!.overall.amount}
              percentage={data!.overall.percentage}
              highlight
              onClick={() =>
                openEdit({ id: data!.overall!.id, categoryId: null, amount: data!.overall!.amount })
              }
            />
          )}
          {data!.items.map((b) => (
            <BudgetRow
              key={b.id}
              label={b.categoryName}
              icon={b.categoryIcon}
              spent={b.spent}
              amount={b.amount}
              percentage={b.percentage}
              onClick={() => openEdit({ id: b.id, categoryId: b.categoryId, amount: b.amount })}
            />
          ))}
        </div>
      )}

      <BudgetModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editing={editing}
        onSaved={fetchBudgets}
      />
    </section>
  )
}

function BudgetRow({
  label,
  icon,
  spent,
  amount,
  percentage,
  highlight,
  onClick,
}: {
  label: string
  icon: string
  spent: number
  amount: number
  percentage: number
  highlight?: boolean
  onClick: () => void
}) {
  const over = percentage >= 100
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer w-full text-left rounded-xl p-3 transition-colors hover:bg-[var(--surface-2)] ${
        highlight ? "bg-[var(--brand-bg)]" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
          <span className="text-base leading-none">{icon}</span>
          {label}
        </span>
        <span className="text-xs tabular-nums text-[var(--ink-2)]">
          <span className={over ? "font-semibold text-[var(--neg)]" : "font-semibold text-[var(--ink)]"}>
            {inr(spent)}
          </span>{" "}
          / {inr(amount)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: barColor(percentage) }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-[var(--ink-3)]">
        <span>{percentage}% used</span>
        <span>
          {over ? `${inr(spent - amount)} over` : `${inr(amount - spent)} left`}
        </span>
      </div>
    </button>
  )
}
