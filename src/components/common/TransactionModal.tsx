"use client"

import React, { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useTransactionStore } from "@/store/transactionStore"
import { CalendarIcon, ChevronDown, IndianRupee, Search, Tag } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

type ExistingTransaction = {
  id: string
  amount: number
  type: "income" | "expense"
  description: string | null
  date: string
  category: { id: string; name: string; icon: string }
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "income" | "expense"
  onSuccess?: (result: any) => void
  /** Pass to open in edit mode */
  transaction?: ExistingTransaction | null
  /** Seed amount/description when opening in create mode (e.g. from quick-add) */
  prefill?: { amount?: number; description?: string }
}

export function TransactionModal({ open, onOpenChange, type, onSuccess, transaction, prefill }: Props) {
  const isEditMode = !!transaction

  const [internalTxType, setInternalTxType] = useState<"income" | "expense">(type)
  const isIncome = internalTxType === "income"

  const {
    isLoading: storeLoading,
    expenseCategories,
    incomeCategories,
    addTransaction,
    getIncomeCategories,
    getExpenseCategories,
  } = useTransactionStore()

  const [isSaving, setIsSaving] = useState(false)
  const isLoading = isEditMode ? isSaving : storeLoading

  const categories = isIncome ? incomeCategories : expenseCategories

  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState<number | "">("")
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [catSearch, setCatSearch] = useState("")
  const catSearchRef = useRef<HTMLInputElement>(null)

  // Seed fields when opening in edit mode
  useEffect(() => {
    if (open && isEditMode && transaction) {
      setInternalTxType(transaction.type)
      setDescription(transaction.description ?? "")
      setAmount(transaction.amount)
      setCategoryId(String(transaction.category.id))
      setSelectedDate(new Date(transaction.date))
    }
  }, [open, isEditMode, transaction])

  // Create mode: sync the type prop on open (modal instance is reused globally),
  // then seed any quick-add prefill (amount/description).
  useEffect(() => {
    if (open && !isEditMode) {
      setInternalTxType(type)
      if (prefill?.amount != null) setAmount(prefill.amount)
      if (prefill?.description) setDescription(prefill.description)
    }
  }, [open, isEditMode, type, prefill])

  // Load categories whenever the modal opens or type toggles
  useEffect(() => {
    if (!open) return
    if (isIncome) {
      getIncomeCategories().catch(() => {})
    } else {
      getExpenseCategories().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isIncome])

  // Auto-focus category search input
  useEffect(() => {
    if (categoryOpen) {
      setCatSearch("")
      setTimeout(() => catSearchRef.current?.focus(), 50)
    }
  }, [categoryOpen])

  // Reset all fields on close
  useEffect(() => {
    if (!open) {
      setDescription("")
      setAmount("")
      setCategoryId(null)
      setSelectedDate(new Date())
      setCategoryOpen(false)
      setCalendarOpen(false)
      setCatSearch("")
      setIsSaving(false)
    }
  }, [open])

  const selectedCategory = categories.find((c) => String(c.id) === String(categoryId))

  const filteredCategories = catSearch.trim()
    ? categories.filter((c) => c.name.toLowerCase().startsWith(catSearch.toLowerCase()))
    : categories

  function validate() {
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return false
    }
    if (!categoryId) {
      toast.error("Please select a category")
      return false
    }
    return true
  }

  async function handleCreate() {
    if (!validate()) return

    const normalizedCategory =
      typeof categoryId === "string" && /^\d+$/.test(categoryId)
        ? Number(categoryId)
        : categoryId

    const created = await addTransaction(isIncome ? "income" : "expense", {
      description: description || undefined,
      amount: Number(amount),
      categoryId: normalizedCategory,
      date: format(selectedDate, "yyyy-MM-dd"),
    })

    if (created) {
      toast.success(`${isIncome ? "Income" : "Expense"} added successfully`)
      onOpenChange(false)
      window.dispatchEvent(new Event("transaction-added"))
      onSuccess?.(created)
    } else {
      toast.error("Failed to create transaction. Try again.")
    }
  }

  async function handleEdit() {
    if (!validate() || !transaction) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: internalTxType,
          amount: Number(amount),
          categoryId,
          description: description || null,
          date: format(selectedDate, "yyyy-MM-dd"),
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Failed to update transaction")
      }
      toast.success("Transaction updated")
      onOpenChange(false)
      window.dispatchEvent(new Event("transaction-added"))
      onSuccess?.(await res.json().catch(() => null))
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update transaction")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-3rem)] sm:max-w-lg rounded-2xl px-6 py-4 sm:px-8 sm:py-7 bg-white dark:bg-zinc-900 max-h-[90dvh] overflow-y-auto">
        <DialogHeader className="pb-0 sm:pb-1">
          <DialogTitle className="text-lg sm:text-2xl font-bold leading-tight">
            {isEditMode ? "Edit " : "Create a "}
            <span className={isIncome ? "text-[var(--pos)]" : "text-[var(--neg)]"}>
              {isEditMode ? (isIncome ? "income" : "expense") : `new ${isIncome ? "income" : "expense"}`}
            </span>
            {" "}transaction
          </DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            {isEditMode
              ? "Update the details below. Changes will reflect immediately."
              : "Add a transaction to your account. This will update dashboard data."}
          </p>
        </DialogHeader>

        <div className="grid gap-3 sm:gap-5 py-2 sm:py-3">
          {/* Type toggle */}
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => { setInternalTxType("expense"); setCategoryId(null) }}
              className={`cursor-pointer flex-1 text-sm font-semibold py-2 sm:py-2.5 transition-all ${
                !isIncome
                  ? "bg-[var(--surface)] text-[var(--neg)] shadow-sm"
                  : "bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)]"
              }`}
            >
              Expense
            </button>
            <button
              onClick={() => { setInternalTxType("income"); setCategoryId(null) }}
              className={`cursor-pointer flex-1 text-sm font-semibold py-2 sm:py-2.5 transition-all ${
                isIncome
                  ? "bg-[var(--surface)] text-[var(--pos)] shadow-sm"
                  : "bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)]"
              }`}
            >
              Income
            </button>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Transaction description (optional)"
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground hidden sm:block">
              Keep it short — e.g. &quot;Freelance - Jan Invoice&quot;.
            </p>
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Amount
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <IndianRupee className="h-4 w-4" />
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={amount as any}
                  onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0.00"
                  className="pl-9 rounded-xl"
                />
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">Transaction amount (required)</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Transaction Date
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button className="cursor-pointer flex items-center gap-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm hover:bg-muted/40 transition-colors text-left">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{format(selectedDate, "MM/dd/yyyy")}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => {
                      if (d) { setSelectedDate(d); setCalendarOpen(false) }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground hidden sm:block">Select a date for this transaction</p>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Category
            </Label>
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
              <PopoverTrigger asChild>
                <button className="cursor-pointer flex items-center gap-2 w-full rounded-xl border border-input bg-background px-3 py-2 sm:py-2.5 text-sm hover:bg-muted/40 transition-colors text-left">
                  <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className={selectedCategory ? "text-foreground" : "text-muted-foreground"}>
                    {selectedCategory
                      ? `${selectedCategory.icon}  ${selectedCategory.name}`
                      : "Select a category"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    ref={catSearchRef}
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                    placeholder="Search categories…"
                    className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="max-h-52 overflow-y-scroll" onWheel={(e) => e.stopPropagation()}>
                  {filteredCategories.length === 0 && (
                    <p className="text-sm text-muted-foreground px-3 py-2">No results</p>
                  )}
                  {filteredCategories.map((c) => (
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
            <p className="text-xs text-muted-foreground hidden sm:block">Choose a category for this transaction</p>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-1 flex-row sm:flex-row">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={isEditMode ? handleEdit : handleCreate}
            disabled={isLoading}
            className="flex-1 sm:flex-none bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white px-6"
          >
            {isLoading
              ? isEditMode ? "Saving..." : "Creating..."
              : isEditMode ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
