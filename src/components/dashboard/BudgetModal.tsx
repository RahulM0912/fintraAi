"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useTransactionStore } from "@/store/transactionStore"
import { ChevronDown, IndianRupee, Tag, Trash2 } from "lucide-react"
import { toast } from "sonner"

export type EditingBudget = {
  id?: string
  categoryId: string | null
  amount: number
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  /** Existing budget to edit, or null/undefined to create a new one */
  editing?: EditingBudget | null
}

const OVERALL = "__overall__"

export function BudgetModal({ open, onOpenChange, onSaved, editing }: Props) {
  const { expenseCategories, getExpenseCategories } = useTransactionStore()

  const [categoryValue, setCategoryValue] = useState<string>(OVERALL)
  const [amount, setAmount] = useState<number | "">("")
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    getExpenseCategories().catch(() => {})
    setCategoryValue(editing?.categoryId ?? OVERALL)
    setAmount(editing?.amount ?? "")
  }, [open, editing, getExpenseCategories])

  const isEdit = !!editing?.id
  const selectedCat = expenseCategories.find((c) => String(c.id) === categoryValue)
  const categoryLabel =
    categoryValue === OVERALL
      ? "Overall — all spending"
      : selectedCat
      ? selectedCat.name
      : "Select a category"

  async function save() {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid budget amount")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: categoryValue === OVERALL ? null : categoryValue,
          amount: Number(amount),
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success(isEdit ? "Budget updated" : "Budget set")
      window.dispatchEvent(new Event("transaction-added"))
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message || "Failed to save budget")
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!editing?.id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/budgets?id=${editing.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(await res.text())
      toast.success("Budget removed")
      window.dispatchEvent(new Event("transaction-added"))
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove budget")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-3rem)] sm:max-w-md rounded-xl bg-[var(--surface)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isEdit ? "Edit budget" : "Set a monthly budget"}
          </DialogTitle>
          <p className="text-sm text-[var(--ink-3)]">
            A monthly spending cap. Track progress on your dashboard.
          </p>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Category */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)]">
              Applies to
            </Label>
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
              <PopoverTrigger asChild>
                <button
                  disabled={isEdit}
                  className="cursor-pointer flex items-center gap-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-left hover:bg-muted/40 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{categoryLabel}</span>
                  {!isEdit && <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                <div className="max-h-56 overflow-y-auto">
                  <CatRow
                    label="Overall — all spending"
                    active={categoryValue === OVERALL}
                    onClick={() => { setCategoryValue(OVERALL); setCategoryOpen(false) }}
                  />
                  {expenseCategories.map((c) => (
                    <CatRow
                      key={String(c.id)}
                      label={c.name}
                      active={categoryValue === String(c.id)}
                      onClick={() => { setCategoryValue(String(c.id)); setCategoryOpen(false) }}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {isEdit && (
              <p className="text-xs text-[var(--ink-3)]">Category can&apos;t be changed — remove and re-add to move it.</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)]">
              Monthly limit
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <IndianRupee className="h-4 w-4" />
              </span>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={amount as any}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0"
                className="pl-9 rounded-xl"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-row sm:justify-between">
          {isEdit ? (
            <Button
              variant="ghost"
              onClick={remove}
              disabled={saving}
              className="text-[var(--neg)] hover:text-[var(--neg)] gap-2"
            >
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white px-6"
            >
              {saving ? "Saving..." : isEdit ? "Save" : "Set budget"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CatRow({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer w-full text-left text-sm px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-muted transition-colors ${
        active ? "bg-muted font-medium" : ""
      }`}
    >
      {label}
    </button>
  )
}
