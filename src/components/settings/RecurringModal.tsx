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
import { ChevronDown, IndianRupee, Tag } from "lucide-react"
import { toast } from "sonner"

export type EditingRule = {
  id: string
  type: "income" | "expense"
  categoryId: string
  categoryLabel: string
  amount: number
  dayOfMonth: number
  description: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  editing?: EditingRule | null
}

export function RecurringModal({ open, onOpenChange, onSaved, editing }: Props) {
  const {
    incomeCategories,
    expenseCategories,
    getIncomeCategories,
    getExpenseCategories,
  } = useTransactionStore()

  const [type, setType] = useState<"income" | "expense">("expense")
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [amount, setAmount] = useState<number | "">("")
  const [dayOfMonth, setDayOfMonth] = useState<number | "">(1)
  const [description, setDescription] = useState("")
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const isEdit = !!editing

  useEffect(() => {
    if (!open) return
    getIncomeCategories().catch(() => {})
    getExpenseCategories().catch(() => {})
    if (editing) {
      setType(editing.type)
      setCategoryId(editing.categoryId)
      setAmount(editing.amount)
      setDayOfMonth(editing.dayOfMonth)
      setDescription(editing.description ?? "")
    } else {
      setType("expense")
      setCategoryId(null)
      setAmount("")
      setDayOfMonth(1)
      setDescription("")
    }
  }, [open, editing, getIncomeCategories, getExpenseCategories])

  const categories = type === "income" ? incomeCategories : expenseCategories
  const selectedCat = categories.find((c) => String(c.id) === categoryId)

  async function save() {
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount")
    const dom = Number(dayOfMonth)
    if (!dom || dom < 1 || dom > 28) return toast.error("Day must be between 1 and 28")
    if (!isEdit && !categoryId) return toast.error("Pick a category")

    setSaving(true)
    try {
      const res = isEdit
        ? await fetch("/api/recurring", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: editing!.id,
              amount: Number(amount),
              dayOfMonth: dom,
              description: description || null,
            }),
          })
        : await fetch("/api/recurring", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: Number(amount),
              type,
              categoryId,
              dayOfMonth: dom,
              description: description || null,
            }),
          })
      if (!res.ok) throw new Error(await res.text())
      toast.success(isEdit ? "Recurring updated" : "Recurring scheduled")
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-3rem)] sm:max-w-md rounded-2xl bg-[var(--surface)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isEdit ? "Edit recurring" : "New recurring transaction"}
          </DialogTitle>
          <p className="text-sm text-[var(--ink-3)]">
            Auto-posts once a month. First post is the next occurrence — never back-dated.
          </p>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Type toggle (locked on edit) */}
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              disabled={isEdit}
              onClick={() => { setType("expense"); setCategoryId(null) }}
              className={`cursor-pointer flex-1 text-sm font-semibold py-2 transition-all disabled:cursor-not-allowed ${
                type === "expense"
                  ? "bg-[var(--surface)] text-[var(--neg)] shadow-sm"
                  : "bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)]"
              }`}
            >
              Expense
            </button>
            <button
              disabled={isEdit}
              onClick={() => { setType("income"); setCategoryId(null) }}
              className={`cursor-pointer flex-1 text-sm font-semibold py-2 transition-all disabled:cursor-not-allowed ${
                type === "income"
                  ? "bg-[var(--surface)] text-[var(--pos)] shadow-sm"
                  : "bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)]"
              }`}
            >
              Income
            </button>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)]">
              Category
            </Label>
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
              <PopoverTrigger asChild>
                <button
                  disabled={isEdit}
                  className="cursor-pointer flex items-center gap-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-left hover:bg-muted/40 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className={selectedCat ? "" : "text-muted-foreground"}>
                    {isEdit
                      ? editing!.categoryLabel
                      : selectedCat
                      ? `${selectedCat.icon}  ${selectedCat.name}`
                      : "Select a category"}
                  </span>
                  {!isEdit && <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                <div className="max-h-52 overflow-y-auto">
                  {categories.map((c) => (
                    <button
                      key={String(c.id)}
                      onClick={() => { setCategoryId(String(c.id)); setCategoryOpen(false) }}
                      className={`cursor-pointer w-full text-left text-sm px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-muted transition-colors ${
                        categoryId === String(c.id) ? "bg-muted font-medium" : ""
                      }`}
                    >
                      <span className="text-base">{c.icon}</span>
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Amount + Day */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)]">
                Amount
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <IndianRupee className="h-4 w-4" />
                </span>
                <Input
                  type="number"
                  min={0}
                  value={amount as any}
                  onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0"
                  className="pl-9 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)]">
                Day of month
              </Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={dayOfMonth as any}
                onChange={(e) => setDayOfMonth(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="1"
                className="rounded-xl"
              />
              <p className="text-[11px] text-[var(--ink-3)]">1–28</p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)]">
              Note (optional)
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Rent, Netflix, Salary"
              className="rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white px-6"
          >
            {saving ? "Saving..." : isEdit ? "Save" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
