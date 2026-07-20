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
import { getLastCategory, postAddToast, rememberLastCategory } from "@/lib/quickAdd"
import { PickerList } from "@/components/ui/picker-list"
import { CalendarIcon, ChevronDown, IndianRupee, Tag } from "lucide-react"
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
  /** Seed fields when opening in create mode (e.g. from quick-add) */
  prefill?: { amount?: number; description?: string; categoryId?: string }
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
  const amountRef = useRef<HTMLInputElement>(null)

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
  // then seed any quick-add prefill (amount/description/category).
  useEffect(() => {
    if (open && !isEditMode) {
      setInternalTxType(type)
      if (prefill?.amount != null) setAmount(prefill.amount)
      if (prefill?.description) setDescription(prefill.description)
      if (prefill?.categoryId) setCategoryId(String(prefill.categoryId))
    }
  }, [open, isEditMode, type, prefill])

  // Create mode: preselect the last-used category for this type once
  // categories are in — most people log the same 2–3 categories daily,
  // so the modal opens pre-answered.
  useEffect(() => {
    if (!open || isEditMode || categoryId || prefill?.categoryId) return
    const last = getLastCategory(internalTxType)
    if (last && categories.some((c) => String(c.id) === last)) setCategoryId(last)
  }, [open, isEditMode, categoryId, prefill, internalTxType, categories])

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

  // Reset all fields on close
  useEffect(() => {
    if (!open) {
      setDescription("")
      setAmount("")
      setCategoryId(null)
      setSelectedDate(new Date())
      setCategoryOpen(false)
      setCalendarOpen(false)
      setIsSaving(false)
    }
  }, [open])

  const selectedCategory = categories.find((c) => String(c.id) === String(categoryId))

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

  async function handleCreate(keepOpen = false) {
    if (!validate()) return

    const normalizedCategory =
      typeof categoryId === "string" && /^\d+$/.test(categoryId)
        ? Number(categoryId)
        : categoryId

    const txType = isIncome ? "income" : ("expense" as const)
    const created = await addTransaction(txType, {
      description: description || undefined,
      amount: Number(amount),
      categoryId: normalizedCategory,
      date: format(selectedDate, "yyyy-MM-dd"),
    })

    if (created) {
      rememberLastCategory(txType, String(categoryId))
      postAddToast({
        id: created.id,
        amount: Number(amount),
        type: txType,
        categoryId: String(categoryId),
        categoryName: selectedCategory?.name,
      })
      if (keepOpen) {
        // Batch entry: keep type/category/date, clear what changes per entry.
        // Don't call onSuccess — the provider closes the modal in it.
        setAmount("")
        setDescription("")
        amountRef.current?.focus()
      } else {
        onOpenChange(false)
        onSuccess?.(created)
      }
      window.dispatchEvent(new Event("transaction-added"))
    } else {
      toast.error("Failed to create transaction. Try again.")
    }
  }

  // Enter in a text field saves — logging shouldn't need the mouse.
  function submitOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return
    e.preventDefault()
    if (isEditMode) handleEdit()
    else handleCreate()
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
      <DialogContent
        // Land on the amount — the one field the user always knows.
        onOpenAutoFocus={(e) => {
          if (!isEditMode) {
            e.preventDefault()
            amountRef.current?.focus()
          }
        }}
        className="max-w-[calc(100%-3rem)] sm:max-w-lg rounded-xl px-6 py-4 sm:px-8 sm:py-7 bg-[var(--surface)] max-h-[90dvh] overflow-y-auto"
      >
        <DialogHeader className="pb-0 sm:pb-1">
          <DialogTitle className="font-display text-lg sm:text-2xl font-semibold leading-tight">
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
              onKeyDown={submitOnEnter}
              placeholder='What was it? e.g. "chai with Ravi" (optional)'
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground hidden sm:block">
              Skip it if the category already says enough — no need to repeat it.
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
                  ref={amountRef}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={amount as any}
                  onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  onKeyDown={submitOnEnter}
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
              {/* modal: without it, the Dialog's scroll lock (react-remove-scroll)
                  blocks touchmove on the body-portaled popover — list won't
                  scroll on real touch devices */}
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen} modal>
                <PopoverTrigger asChild>
                  <button className="cursor-pointer flex items-center gap-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm hover:bg-muted/40 transition-colors text-left">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{format(selectedDate, "dd MMM yyyy")}</span>
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
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen} modal>
              <PopoverTrigger asChild>
                <button className="cursor-pointer flex items-center gap-2 w-full rounded-xl border border-input bg-background px-3 py-2 sm:py-2.5 text-sm hover:bg-muted/40 transition-colors text-left">
                  <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className={selectedCategory ? "text-foreground" : "text-muted-foreground"}>
                    {selectedCategory
                      ? selectedCategory.name
                      : "Select a category"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                <PickerList
                  searchable
                  searchPlaceholder="Search categories…"
                  maxHeightClass="max-h-52"
                  options={categories.map((c) => ({ key: String(c.id), label: c.name }))}
                  value={categoryId}
                  onSelect={(key) => {
                    setCategoryId(key)
                    setCategoryOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground hidden sm:block">Choose a category for this transaction</p>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-1">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          {!isEditMode && (
            <Button
              variant="ghost"
              onClick={() => handleCreate(true)}
              disabled={isLoading}
              className="w-full sm:w-auto text-[var(--brand)] hover:text-[var(--brand-hover)]"
            >
              Save & add another
            </Button>
          )}
          <Button
            onClick={() => (isEditMode ? handleEdit() : handleCreate())}
            disabled={isLoading}
            className="w-full sm:w-auto bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white px-6"
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
