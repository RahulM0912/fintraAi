import { toast } from "sonner"
import { useDashboardStore } from "@/store/dashboardStore"

// ─── Quick-add helpers: category memory + the post-add toast ────────────────────
//
// Daily logging is a habit loop: the less it asks, the more it gets used.
// - Last-used category is remembered per type so the modal opens pre-answered.
// - The post-add toast closes the loop: Undo (mistakes are one tap away from
//   gone) and, when a budget applies, where this entry leaves it.

const LAST_CATEGORY_KEY = "fintra:last-category"

export function rememberLastCategory(type: "income" | "expense", categoryId: string) {
  try {
    localStorage.setItem(`${LAST_CATEGORY_KEY}:${type}`, categoryId)
  } catch {
    // storage unavailable (private mode etc.) — memory is a nicety, not a need
  }
}

export function getLastCategory(type: "income" | "expense"): string | null {
  try {
    return localStorage.getItem(`${LAST_CATEGORY_KEY}:${type}`)
  } catch {
    return null
  }
}

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`
}

/** Budget standing after this expense, from cached dashboard data (which is
 *  pre-add at this moment, so the new amount is added on top). Null when no
 *  budget applies or the dashboard was never loaded. */
function budgetLine(categoryId: string | null, amount: number): string | null {
  const budgets = useDashboardStore.getState().budgets
  if (!budgets) return null

  const item = categoryId
    ? budgets.items.find((i) => i.categoryId === categoryId)
    : undefined
  const scope = item
    ? { label: item.categoryName, amount: item.amount, spent: item.spent }
    : budgets.overall
    ? { label: "overall budget", amount: budgets.overall.amount, spent: budgets.overall.spent }
    : null
  if (!scope || scope.amount <= 0) return null

  const newSpent = scope.spent + amount
  const pct = Math.round((newSpent / scope.amount) * 100)
  if (pct >= 100)
    return `${scope.label}: over budget by ${inr(newSpent - scope.amount)}`
  return `${scope.label}: ${pct}% of budget used · ${inr(scope.amount - newSpent)} left`
}

interface AddedTransaction {
  id: string
  amount: number
  type: "income" | "expense"
  categoryId: string | null
  categoryName?: string
}

/** Success toast with Undo. The reward for logging is knowing where you
 *  stand, so expenses carry their budget consequence when one applies. */
export function postAddToast(tx: AddedTransaction) {
  const sign = tx.type === "income" ? "+" : "−"
  const title = `Logged ${sign}${inr(tx.amount)}${tx.categoryName ? ` · ${tx.categoryName}` : ""}`
  const description =
    tx.type === "expense" ? budgetLine(tx.categoryId, tx.amount) ?? undefined : undefined

  toast.success(title, {
    description,
    action: {
      label: "Undo",
      onClick: async () => {
        try {
          const res = await fetch(`/api/transactions/${tx.id}`, { method: "DELETE" })
          if (!res.ok) throw new Error()
          window.dispatchEvent(new Event("transaction-added"))
          toast.success("Removed")
        } catch {
          toast.error("Couldn't undo — remove it from the ledger")
        }
      },
    },
  })
}
