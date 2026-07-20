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
import { PickerList } from "@/components/ui/picker-list"
import { useTransactionStore } from "@/store/transactionStore"
import { useTapConfirm } from "@/lib/useTapConfirm"
import { ChevronDown, IndianRupee, Loader2, Tag, Trash2 } from "lucide-react"
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
  // Removing gets its own flag — reusing `saving` made the primary button
  // read "Saving..." while a budget was being deleted.
  const [removing, setRemoving] = useState(false)
  const removeConfirm = useTapConfirm(remove)
  const busy = saving || removing

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
    setRemoving(true)
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
      setRemoving(false)
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
            {/* modal: keeps touch scrolling alive inside the Dialog's scroll lock */}
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen} modal>
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
                <PickerList
                  searchable
                  searchPlaceholder="Search categories…"
                  maxHeightClass="max-h-56"
                  options={[
                    { key: OVERALL, label: "Overall — all spending" },
                    ...expenseCategories.map((c) => ({ key: String(c.id), label: c.name })),
                  ]}
                  value={categoryValue}
                  onSelect={(key) => {
                    setCategoryValue(key)
                    setCategoryOpen(false)
                  }}
                />
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

        <DialogFooter className="gap-2 sm:justify-between">
          {isEdit ? (
            <Button
              variant="ghost"
              onClick={removeConfirm.trigger}
              onBlur={removeConfirm.disarm}
              disabled={busy}
              className={
                removeConfirm.armed || removing
                  ? "gap-2 bg-[var(--neg)] text-white hover:bg-[var(--neg)] hover:text-white disabled:opacity-80"
                  : "gap-2 text-[var(--neg)] hover:text-[var(--neg)]"
              }
            >
              {removing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {removing ? "Removing…" : removeConfirm.armed ? "Tap to confirm" : "Remove"}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={busy}
              className="flex-1 sm:flex-none bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white px-6"
            >
              {saving ? "Saving..." : isEdit ? "Save" : "Set budget"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
