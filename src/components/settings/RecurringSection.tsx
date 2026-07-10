"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useTapConfirm } from "@/lib/useTapConfirm"
import { toast } from "sonner"
import { ordinal } from "@/lib/recurring"
import { RecurringModal, type EditingRule } from "@/components/settings/RecurringModal"

type Rule = {
  id: string
  amount: number
  type: "income" | "expense"
  description: string | null
  dayOfMonth: number
  active: boolean
  lastRunDate: string | null
  categoryId: string
  categoryName: string
  categoryIcon: string
}

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`
}

export function RecurringSection() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<EditingRule | null>(null)

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/recurring")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRules(data.rules ?? [])
    } catch {
      setRules([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  async function toggle(rule: Rule) {
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, active: !r.active } : r)))
    try {
      const res = await fetch("/api/recurring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, active: !rule.active }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast.error("Couldn't update")
      fetchRules()
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/recurring?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Removed")
      setRules((prev) => prev.filter((r) => r.id !== id))
    } catch {
      toast.error("Couldn't remove")
    }
  }

  function openEdit(r: Rule) {
    setEditing({
      id: r.id,
      type: r.type,
      categoryId: r.categoryId,
      categoryLabel: r.categoryName,
      amount: r.amount,
      dayOfMonth: r.dayOfMonth,
      description: r.description,
    })
    setModalOpen(true)
  }

  function openNew() {
    setEditing(null)
    setModalOpen(true)
  }

  return (
    <section className="border-t border-[var(--hairline)] pt-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
          Recurring
        </h2>
        <button
          onClick={openNew}
          className="cursor-pointer inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-[var(--brand)] transition-colors duration-150 hover:text-[var(--brand-hover)]"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <p className="py-4 text-sm text-[var(--ink-3)]">
          Nothing recurring yet. Add rent, salary, or subscriptions to auto-post each month.
        </p>
      ) : (
        <div className="divide-y divide-[var(--hairline)]">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium truncate ${r.active ? "text-[var(--ink)]" : "text-[var(--ink-3)] line-through"}`}>
                  {r.description || r.categoryName}
                </p>
                <p className="text-xs text-[var(--ink-3)]">
                  <span className={r.type === "income" ? "text-[var(--pos)]" : "text-[var(--neg)]"}>
                    {r.type === "income" ? "+" : "−"}{inr(r.amount)}
                  </span>{" "}
                  · {r.categoryName} · every {ordinal(r.dayOfMonth)}
                </p>
              </div>

              {/* Active toggle */}
              <button
                onClick={() => toggle(r)}
                role="switch"
                aria-checked={r.active}
                aria-label="Toggle active"
                className={`cursor-pointer relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  r.active ? "bg-[var(--brand)]" : "bg-[var(--surface-2)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    r.active ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>

              <button
                onClick={() => openEdit(r)}
                aria-label="Edit"
                className="cursor-pointer p-1.5 rounded-lg text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <DeleteButton onDelete={() => remove(r.id)} />
            </div>
          ))}
        </div>
      )}

      <RecurringModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editing={editing}
        onSaved={fetchRules}
      />
    </section>
  )
}

/* Tap-to-confirm delete: first tap arms (clay + label), second fires and
   shows "Removing…" until the request settles. Same pattern as the ledger
   rows and budget modal. */
function DeleteButton({ onDelete }: { onDelete: () => Promise<void> }) {
  const [removing, setRemoving] = useState(false)
  const { armed, trigger, disarm } = useTapConfirm(async () => {
    setRemoving(true)
    try {
      await onDelete()
    } finally {
      setRemoving(false)
    }
  })
  const busy = armed || removing
  return (
    <button
      onClick={trigger}
      onBlur={disarm}
      disabled={removing}
      aria-label={removing ? "Removing" : armed ? "Tap again to confirm remove" : "Remove"}
      className={
        busy
          ? "flex h-8 items-center gap-1.5 rounded-lg bg-[var(--neg)] px-2 text-xs font-medium text-white transition-colors disabled:opacity-80"
          : "p-1.5 rounded-lg text-[var(--ink-3)] hover:text-[var(--neg)] hover:bg-[var(--surface-2)] transition-colors"
      }
    >
      {removing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className={busy ? "h-3.5 w-3.5" : "h-4 w-4"} />
      )}
      {removing ? "Removing…" : armed ? "Confirm" : null}
    </button>
  )
}
