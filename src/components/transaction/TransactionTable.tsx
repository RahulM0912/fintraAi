"use client"

import { useState } from "react"
import { Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { TransactionModal } from "@/components/common/TransactionModal"
import { format } from "date-fns"

type Transaction = {
  id: string
  amount: number
  type: "income" | "expense"
  description: string | null
  date: string
  category: { id: string; name: string; icon: string }
}

type Pagination = {
  page: number
  limit: number
  total: number
  hasNext: boolean
  hasPrev: boolean
}

type Props = {
  transactions: Transaction[]
  pagination: Pagination | null
  isLoading: boolean
  onPageChange: (page: number) => void
  onRefresh: () => void
}

const COLS = "grid-cols-[1.4fr_1.2fr_0.9fr_1.2fr_1fr_100px]"

function StatusBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 whitespace-nowrap">
      Completed
    </span>
  )
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  transactionLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isDeleting: boolean
  transactionLabel: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Transaction</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete{" "}
          <span className="font-medium text-foreground">&quot;{transactionLabel}&quot;</span>?
          This action cannot be undone and will update your history.
        </p>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PaginationBar({
  pagination,
  onPageChange,
}: {
  pagination: Pagination
  onPageChange: (p: number) => void
}) {
  const { page, limit, total, hasNext, hasPrev } = pagination
  const totalPages = Math.ceil(total / limit)
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  function getPages(): (number | "...")[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | "...")[] = [1]
    if (page > 3) pages.push("...")
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) {
      pages.push(p)
    }
    if (page < totalPages - 2) pages.push("...")
    pages.push(totalPages)
    return pages
  }

  return (
    <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4">
      <p className="text-xs sm:text-sm text-muted-foreground">
        Showing {start} to {end} of {total} transactions
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
          className="h-8 w-8 rounded-md bg-muted hover:bg-muted/80 disabled:opacity-40 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {getPages().map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`h-8 w-8 rounded-md text-sm flex items-center justify-center transition-colors ${
                p === page
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          className="h-8 w-8 rounded-md bg-muted hover:bg-muted/80 disabled:opacity-40 flex items-center justify-center transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/* ─── Mobile card skeleton ─────────────────────────────────────── */
function MobileSkeletonCard() {
  return (
    <div className="p-4 border-b last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="space-y-1.5 min-w-0">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-4 w-16 shrink-0" />
      </div>
      <Skeleton className="h-3 w-40 mt-3" />
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      </div>
    </div>
  )
}

/* ─── Desktop row skeleton ─────────────────────────────────────── */
function DesktopSkeletonRow() {
  return (
    <div className={`hidden md:grid ${COLS} px-6 py-4 border-b last:border-0 items-center`}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-5 w-20 rounded" />
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-4 w-20 ml-auto" />
      <div className="flex gap-1.5 justify-end">
        <Skeleton className="h-7 w-7 rounded-md" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
    </div>
  )
}

export function TransactionTable({ transactions, pagination, isLoading, onPageChange, onRefresh }: Props) {
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDeleteConfirm() {
    if (!deleteTx) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/transactions/${deleteTx.id}`, { method: "DELETE" })
      if (!res.ok && res.status !== 204) throw new Error("Delete failed")
      toast.success("Transaction deleted")
      setDeleteTx(null)
      onRefresh()
    } catch {
      toast.error("Failed to delete transaction")
    } finally {
      setIsDeleting(false)
    }
  }

  /* ── Desktop table header ── */
  const tableHeader = (
    <div className={`hidden md:grid ${COLS} px-6 py-3 border-b bg-muted/40`}>
      {["CATEGORY", "DESCRIPTION", "STATUS", "DATE & TIME", "AMOUNT", "ACTIONS"].map((h) => (
        <div
          key={h}
          className={`text-xs font-semibold text-muted-foreground tracking-wider uppercase ${
            h === "AMOUNT" || h === "ACTIONS" ? "text-right" : ""
          }`}
        >
          {h}
        </div>
      ))}
    </div>
  )

  return (
    <>
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--hairline)] shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none overflow-hidden">
        {tableHeader}

        {/* Loading skeletons */}
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            {/* Mobile skeleton */}
            <div className="md:hidden">
              <MobileSkeletonCard />
            </div>
            {/* Desktop skeleton */}
            <DesktopSkeletonRow />
          </div>
        ))}

        {/* Empty state */}
        {!isLoading && transactions.length === 0 && (
          <div className="p-16 text-center">
            <p className="text-muted-foreground text-sm">No transactions found for the selected filters.</p>
          </div>
        )}

        {/* Transaction rows */}
        {!isLoading && transactions.map((tx) => {
          const txDate = new Date(tx.date)
          const dateStr = format(txDate, "MMM dd, yyyy")
          const timeStr = format(txDate, "hh:mm aa")
          const isIncome = tx.type === "income"

          return (
            <div key={tx.id} className="relative border-b last:border-0 hover:bg-muted/20 transition-colors">
              {/* Income/expense accent bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${isIncome ? "bg-[var(--pos)]" : "bg-[var(--neg)]"}`} />

              {/* ── Mobile card layout (< md) ── */}
              <div className="md:hidden px-4 py-3.5 pl-5">
                {/* Row 1: icon + category name | amount */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${isIncome ? "bg-[var(--pos-bg)]" : "bg-[var(--surface-2)]"}`}>
                      {tx.category.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">{tx.category.name}</p>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{tx.type}</p>
                    </div>
                  </div>
                  <span className={`font-bold text-sm shrink-0 ${isIncome ? "text-[var(--pos)]" : "text-[var(--neg)]"}`}>
                    {isIncome ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Row 2: description */}
                {tx.description && (
                  <p className="text-xs text-muted-foreground mt-2 truncate">{tx.description}</p>
                )}

                {/* Row 3: date + badge | actions */}
                <div className="flex items-center justify-between mt-2.5 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge />
                    <span className="text-[11px] text-muted-foreground">{dateStr} · {timeStr}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-muted"
                      onClick={() => setEditTx(tx)}
                      title="Edit transaction"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      onClick={() => setDeleteTx(tx)}
                      title="Delete transaction"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* ── Desktop table row (≥ md) ── */}
              <div className={`hidden md:grid ${COLS} px-6 py-4 items-center gap-0`}>
                {/* Category */}
                <div className="flex items-center gap-3 pl-1">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${isIncome ? "bg-[var(--pos-bg)]" : "bg-[var(--surface-2)]"}`}>
                    {tx.category.icon}
                  </div>
                  <div>
                    <p className="font-medium text-sm leading-tight">{tx.category.name}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">{tx.type}</p>
                  </div>
                </div>

                {/* Description */}
                <div className="text-sm text-muted-foreground truncate pr-2">
                  {tx.description || <span className="text-muted-foreground/40 italic">—</span>}
                </div>

                {/* Status */}
                <div><StatusBadge /></div>

                {/* Date & Time */}
                <div className="text-sm text-muted-foreground leading-tight">
                  <div>{dateStr}</div>
                  <div className="text-xs">{timeStr}</div>
                </div>

                {/* Amount */}
                <div className={`font-semibold text-sm text-right ${isIncome ? "text-[var(--pos)]" : "text-[var(--neg)]"}`}>
                  {isIncome ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-muted"
                    onClick={() => setEditTx(tx)}
                    title="Edit transaction"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    onClick={() => setDeleteTx(tx)}
                    title="Delete transaction"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {pagination && pagination.total > 0 && (
        <PaginationBar pagination={pagination} onPageChange={onPageChange} />
      )}

      <TransactionModal
        open={!!editTx}
        onOpenChange={(open) => !open && setEditTx(null)}
        type={editTx?.type ?? "expense"}
        transaction={editTx}
        onSuccess={() => { setEditTx(null); onRefresh() }}
      />

      <DeleteConfirmDialog
        open={!!deleteTx}
        onOpenChange={(open) => !open && setDeleteTx(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        transactionLabel={deleteTx?.description || deleteTx?.category.name || "this transaction"}
      />
    </>
  )
}
