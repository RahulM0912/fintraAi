"use client"

import { useState } from "react"
import { Pencil, Trash2, ChevronLeft, ChevronRight, Plus as PlusIcon } from "lucide-react"
import { useQuickAdd } from "@/components/common/QuickAddProvider"
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

/* The transactions list as an editorial ledger: flat rows on the paper
   background, a small-caps header rule, tabular signed amounts. No card
   chrome, no icon chips, no colored side-bars. */

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

const COLS = "grid-cols-[7rem_1.8fr_1.2fr_8rem_5.5rem]"

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
          <DialogTitle className="font-display">Delete transaction</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Delete{" "}
          <span className="font-medium text-foreground">&quot;{transactionLabel}&quot;</span>?
          This removes it from your history and can&apos;t be undone.
        </p>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting…" : "Delete"}
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
    <div className="flex flex-col-reverse items-center justify-between gap-3 border-t border-[var(--hairline)] pt-4 sm:flex-row">
      <p className="tnum text-[13px] text-[var(--ink-3)]">
        {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
          aria-label="Previous page"
          className="cursor-pointer flex h-10 w-10 items-center justify-center rounded-lg text-[var(--ink-2)] transition-colors duration-150 hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {getPages().map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-sm text-[var(--ink-3)]">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
              className={`cursor-pointer tnum flex h-10 w-10 items-center justify-center rounded-lg text-sm transition-colors duration-150 ${
                p === page
                  ? "font-semibold text-[var(--ink)] underline decoration-[var(--brand)] decoration-2 underline-offset-8"
                  : "text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          aria-label="Next page"
          className="cursor-pointer flex h-10 w-10 items-center justify-center rounded-lg text-[var(--ink-2)] transition-colors duration-150 hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="border-b border-[var(--hairline)] py-4">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <button
        onClick={onEdit}
        aria-label="Edit transaction"
        className="cursor-pointer flex h-10 w-10 items-center justify-center rounded-lg text-[var(--ink-3)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={onDelete}
        aria-label="Delete transaction"
        className="cursor-pointer flex h-10 w-10 items-center justify-center rounded-lg text-[var(--ink-3)] transition-colors duration-150 hover:bg-[var(--neg-bg)] hover:text-[var(--neg)]"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

export function TransactionTable({ transactions, pagination, isLoading, onPageChange, onRefresh }: Props) {
  const { openAdd } = useQuickAdd()
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

  return (
    <>
      <div>
        {/* Ledger header — desktop only */}
        <div
          className={`hidden md:grid ${COLS} items-center gap-4 border-b border-[var(--hairline-strong)] pb-2`}
        >
          {["Date", "Description", "Category", "Amount", ""].map((h, i) => (
            <div
              key={i}
              className={`text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)] ${
                h === "Amount" ? "text-right" : ""
              }`}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Skeletons only when there's nothing to show yet (first load).
            On filter/page changes the previous rows stay visible, dimmed,
            so the table never flashes. */}
        {isLoading && transactions.length === 0 &&
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

        {/* Empty state */}
        {!isLoading && transactions.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-display text-lg text-[var(--ink)]">
              Nothing in this view.
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--ink-2)]">
              Try a wider period or clear the search — or add the first entry
              and start the record.
            </p>
            <Button onClick={() => openAdd("expense")} className="mt-6 min-h-11 px-5">
              <PlusIcon className="mr-1 h-4 w-4" /> Add transaction
            </Button>
          </div>
        )}

        {/* Ledger rows */}
        <div
          aria-busy={isLoading || undefined}
          className={
            isLoading && transactions.length > 0
              ? "opacity-50 transition-opacity duration-150 ease-out pointer-events-none"
              : "transition-opacity duration-150 ease-out"
          }
        >
          {transactions.map((tx) => {
            const txDate = new Date(tx.date)
            const isIncome = tx.type === "income"
            const amount = (
              <span
                className={`tnum text-sm font-medium ${
                  isIncome ? "text-[var(--pos)]" : "text-[var(--ink)]"
                }`}
              >
                {isIncome ? "+" : "−"}₹
                {tx.amount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            )

            return (
              <div key={tx.id} className="border-b border-[var(--hairline)]">
                {/* ── Mobile ledger row (< md) ── */}
                <div className="flex items-start justify-between gap-3 py-3.5 md:hidden">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--ink)]">
                      {tx.description || tx.category.name}
                    </p>
                    <p className="tnum mt-1 text-xs text-[var(--ink-3)]">
                      {format(txDate, "dd MMM yyyy")} · {tx.category.name}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {amount}
                    <RowActions
                      onEdit={() => setEditTx(tx)}
                      onDelete={() => setDeleteTx(tx)}
                    />
                  </div>
                </div>

                {/* ── Desktop ledger row (≥ md) ── */}
                <div className={`hidden md:grid ${COLS} items-center gap-4 py-3`}>
                  <div className="tnum text-[13px] leading-snug text-[var(--ink-3)]">
                    <div>{format(txDate, "dd MMM yyyy")}</div>
                    <div className="text-xs">{format(txDate, "hh:mm aa")}</div>
                  </div>
                  <div className="truncate text-sm font-medium text-[var(--ink)]">
                    {tx.description || (
                      <span className="font-normal text-[var(--ink-3)]">—</span>
                    )}
                  </div>
                  <div className="truncate text-sm text-[var(--ink-2)]">
                    {tx.category.name}
                  </div>
                  <div className="text-right">{amount}</div>
                  <RowActions
                    onEdit={() => setEditTx(tx)}
                    onDelete={() => setDeleteTx(tx)}
                  />
                </div>
              </div>
            )
          })}
        </div>
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
