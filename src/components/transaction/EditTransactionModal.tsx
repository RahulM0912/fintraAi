"use client"

import { useEffect, useState } from "react"
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
import { Calendar, IndianRupee } from "lucide-react"
import { toast } from "sonner"

type Category = { id: string; name: string; icon: string }

type Transaction = {
  id: string
  amount: number
  type: "income" | "expense"
  description: string | null
  date: string
  category: { id: string; name: string; icon: string }
}

type Props = {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditTransactionModal({ transaction, open, onOpenChange, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [internalType, setInternalType] = useState<"income" | "expense">("expense")
  const [amount, setAmount] = useState<number | "">("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    if (transaction && open) {
      setInternalType(transaction.type)
      setAmount(transaction.amount)
      setDescription(transaction.description ?? "")
      setDate(new Date(transaction.date).toISOString().slice(0, 10))
      setCategoryId(String(transaction.category.id))
    }
  }, [transaction, open])

  useEffect(() => {
    if (!open) return
    fetch(`/api/categories?type=${internalType}`)
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {})
  }, [open, internalType])

  async function handleSave() {
    if (!transaction) return
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    if (!categoryId) {
      toast.error("Select a category")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          type: internalType,
          categoryId,
          date,
          description: description || null,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Failed to update transaction")
      }
      toast.success("Transaction updated")
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update transaction")
    } finally {
      setIsLoading(false)
    }
  }

  const isIncome = internalType === "income"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl sm:rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-baseline gap-2 text-lg font-semibold">
            Edit{" "}
            <span className={isIncome ? "text-[var(--pos)]" : "text-[var(--neg)]"}>
              {isIncome ? "income" : "expense"}
            </span>{" "}
            transaction
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Update transaction details below.
          </p>
        </DialogHeader>

        <div className="grid gap-4 py-3">
          {/* Type toggle */}
          <div className="flex bg-[var(--surface-2)] p-1 rounded-xl w-full sm:w-64">
            <button
              onClick={() => { setInternalType("expense"); setCategoryId("") }}
              className={`cursor-pointer flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${!isIncome ? "bg-[var(--surface)] shadow-sm text-[var(--neg)]" : "text-[var(--ink-2)] hover:text-[var(--ink)]"}`}
            >
              Expense
            </button>
            <button
              onClick={() => { setInternalType("income"); setCategoryId("") }}
              className={`cursor-pointer flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${isIncome ? "bg-[var(--surface)] shadow-sm text-[var(--pos)]" : "text-[var(--ink-2)] hover:text-[var(--ink)]"}`}
            >
              Income
            </button>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="edit-description" className="mb-2">Description</Label>
            <Input
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Transaction description (optional)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <Label htmlFor="edit-amount" className="mb-2">Amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <IndianRupee className="h-4 w-4" />
                </span>
                <Input
                  id="edit-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={amount as any}
                  onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0.00"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="edit-date" className="mb-2">Date</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                </span>
                <Input
                  id="edit-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <Label className="mb-2">Category</Label>
            <Select
              value={categoryId || "uncategorized"}
              onValueChange={(v) => setCategoryId(v === "uncategorized" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <div className="max-h-64 overflow-y-auto py-2">
                  <SelectItem value="uncategorized">Select a category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={String(c.id)} value={String(c.id)}>
                      <span className="text-lg">{c.icon}</span>
                      <span>{c.name}</span>
                    </SelectItem>
                  ))}
                </div>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-3 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
