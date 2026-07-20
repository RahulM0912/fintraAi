"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { BudgetModal, type EditingBudget } from "@/components/dashboard/BudgetModal"
import { useDashboardStore } from "@/store/dashboardStore"

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`
}

export function BudgetCard() {
  // Budgets come from the page-level /api/dashboard fetch; saving a budget
  // triggers a background store refresh.
  const { budgets: data, hydrated, fetchDashboard } = useDashboardStore()
  const loading = !hydrated
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<EditingBudget | null>(null)

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
    <section
      id="budgets"
      aria-label="Budgets"
      className="scroll-mt-24 border-t border-[var(--hairline)] pt-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
          Budgets
        </h2>
        <button
          onClick={openNew}
          className="cursor-pointer inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-[var(--brand)] transition-colors duration-150 hover:text-[var(--brand-hover)]"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden /> Add budget
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : !hasAny ? (
        <div className="py-6">
          <p className="text-sm text-[var(--ink-2)]">
            No caps set. Give a category a monthly limit and Fintra will warn
            you in the briefing before you cross it.
          </p>
          <button
            onClick={openNew}
            className="cursor-pointer mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--hairline-strong)] px-4 text-sm font-medium text-[var(--ink)] transition-colors duration-150 ease-out hover:border-[var(--ink-3)]"
          >
            <Plus className="h-4 w-4" aria-hidden /> Set your first budget
          </button>
        </div>
      ) : (
        // The ul owns the -mx-2 bleed: a negative margin on rows would
        // horizontally overflow the scroll container
        <ul className="custom-scrollbar scroll-shade -mx-2 max-h-[23rem] space-y-1 overflow-y-auto overscroll-y-contain px-2 lg:max-h-none lg:min-h-0 lg:flex-1">
          {data!.overall && (
            <BudgetRow
              label="All spending"
              spent={data!.overall.spent}
              amount={data!.overall.amount}
              percentage={data!.overall.percentage}
              onClick={() =>
                openEdit({ id: data!.overall!.id, categoryId: null, amount: data!.overall!.amount })
              }
            />
          )}
          {data!.items.map((b) => (
            <BudgetRow
              key={b.id}
              label={b.categoryName}
              spent={b.spent}
              amount={b.amount}
              percentage={b.percentage}
              onClick={() => openEdit({ id: b.id, categoryId: b.categoryId, amount: b.amount })}
            />
          ))}
        </ul>
      )}

      <BudgetModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editing={editing}
        onSaved={fetchDashboard}
      />
    </section>
  )
}

/* Fine under 80% (evergreen); at 80%+ the bar turns clay and the caption
   says so in words — color is never the only signal. */
function BudgetRow({
  label,
  spent,
  amount,
  percentage,
  onClick,
}: {
  label: string
  spent: number
  amount: number
  percentage: number
  onClick: () => void
}) {
  const over = percentage >= 100
  const close = percentage >= 80 && !over
  const barColor = percentage >= 80 ? "var(--neg)" : "var(--pos)"
  return (
    <li>
      <button
        onClick={onClick}
        className="cursor-pointer w-full rounded-lg px-2 py-3 text-left transition-colors duration-150 ease-out hover:bg-[var(--surface-2)]"
      >
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
          <span className="truncate font-medium text-[var(--ink)]">{label}</span>
          <span className="tnum shrink-0 text-[var(--ink-2)]">
            <span className={over ? "font-semibold text-[var(--neg)]" : "font-semibold text-[var(--ink)]"}>
              {inr(spent)}
            </span>{" "}
            / {inr(amount)}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full transition-[width] duration-200 ease-out"
            style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: barColor }}
          />
        </div>
        <p className="tnum mt-1.5 text-xs text-[var(--ink-3)]">
          {over
            ? `over by ${inr(spent - amount)}`
            : close
            ? `close to the cap — ${inr(amount - spent)} left`
            : `${percentage}% used · ${inr(amount - spent)} left`}
        </p>
      </button>
    </li>
  )
}
