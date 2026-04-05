"use client"

import React, { useEffect, useState } from "react"
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { useTransactionStore } from "@/store/transactionStore"
import { Calendar, DollarSign } from "lucide-react"
import { toast } from "sonner"
import { useDashboardStore } from "@/store/dashboardStore"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "income" | "expense"
  onSuccess?: (created: any) => void
}

export function TransactionModal({ open, onOpenChange, type, onSuccess }: Props) {
  const isIncome = type === "income"

  // store: categories + actions
  const {
    isLoading,
    expenseCategories,
    incomeCategories,
    addTransaction,
    getIncomeCategories,
    getExpenseCategories,
  } = useTransactionStore()

  // choose categories based on type
  const categories = isIncome ? incomeCategories : expenseCategories

  // form state
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState<number | "">("")
  const [categoryId, setCategoryId] = useState<string | number | null>(null)
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
  const [date, setDate] = useState<string>("") // yyyy-mm-dd
  const [localError, setLocalError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    setDate(new Date().toISOString().slice(0, 10))
  }, [])

  // load categories when modal opens (if not loaded)
  useEffect(() => {
    if (!open) return

    if (isIncome) {
      if (!incomeCategories || incomeCategories.length === 0) {
        getIncomeCategories().catch(() => {
          /* ignore, store sets error */
        })
      }
    } else {
      if (!expenseCategories || expenseCategories.length === 0) {
        getExpenseCategories().catch(() => {
          /* ignore */
        })
      }
    }
  }, [open, isIncome, getIncomeCategories, getExpenseCategories, incomeCategories, expenseCategories])

  // reset form on close
  useEffect(() => {
    if (!open) {
      setDescription("")
      setAmount("")
      setCategoryId(null)
      setSelectedIcon(null)
      setDate(new Date().toISOString().slice(0, 10))
      setLocalError(null)
    }
  }, [open])

  // when user selects category id, also update selectedIcon from categories list
  function handleCategoryChange(v: string) {
    console.log("Selected value:", v, "Categories:", categories)
    if (v === "uncategorized") {
      setCategoryId(null)
      setSelectedIcon(null)
      return
    }
    // Don't convert UUID strings to numbers
    setCategoryId(v)
    const found = categories.find((c) => String(c.id) === String(v))
    setSelectedIcon(found?.icon ?? null)
    console.log("Category set to:", v, "Found:", found)
  }

  async function handleCreate() {
    // Amount validation
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    // Category validation (NOW REQUIRED)
    if (!categoryId) {
      toast.error("Please select a category")
      return
    }

    const normalizedCategory =
      typeof categoryId === "string" && /^\d+$/.test(categoryId)
        ? Number(categoryId)
        : categoryId

    const payload = {
      description: description || undefined,
      amount: Number(amount),
      categoryId: normalizedCategory,
      date,
    }

    const created = await addTransaction(isIncome ? "income" : "expense", payload)

    if (created) {
      toast.success(`${isIncome ? "Income" : "Expense"} added successfully`)
      onOpenChange(false)
      onSuccess?.(created)
    } else {
      toast.error("Failed to create transaction. Try again.")
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl sm:rounded-lg">
        <DialogHeader className="flex items-start justify-between gap-4 pb-2">
          <div>
            <DialogTitle className="flex items-baseline gap-3">
              <span className="text-lg font-semibold">
                Create a new{" "}
                <span
                  className={`inline-flex items-center rounded px-2 py-0.5 font-medium ${
                    isIncome ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isIncome ? "income" : "expense"}
                </span>{" "}
                transaction
              </span>
            </DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a transaction to your account. This will update dashboard data.
            </p>
          </div>
        </DialogHeader>

        {/* Form */}
        <div className="grid gap-4 py-3">
          <div>
            <Label htmlFor="description" className="mb-2">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Transaction description (optional)"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Keep it short — e.g. &quot;Freelance - Jan invoice&quot;.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            {/* Amount */}
            <div>
              <Label htmlFor="amount" className="mb-2">
                Amount
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                </span>
                <Input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={amount as any}
                  onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0.00"
                  className="pl-10"
                  min={0}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Transaction amount (required)</p>
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="date" className="mb-2">
                Transaction date
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                </span>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-10" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Select a date for this transaction</p>
            </div>
          </div>

          <div>
            <Label className="mb-2">Category</Label>

            <Select onValueChange={handleCategoryChange} value={categoryId ? String(categoryId) : "uncategorized"}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>

              <SelectContent>
                <div  className="max-h-64 overflow-y-auto py-2">
                  <SelectItem value="uncategorized">Select a category</SelectItem>

                  {categories.map((c) => (
                    <SelectItem
                      key={String(c.id)}
                      value={String(c.id)}
                    >
                      <span className="text-lg">{c.icon}</span>
                      <span>{c.name}</span>
                    </SelectItem>
                  ))}
                </div>
              </SelectContent>

            </Select>


            <p className="mt-1 text-xs text-muted-foreground">Choose a category for this transaction</p>
          </div>

          {localError && <div className="rounded-md bg-rose-900/40 p-2 text-sm text-rose-300">{localError}</div>}
        </div>

        <DialogFooter className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
