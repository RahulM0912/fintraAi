// src/store/transactionStore.ts
import { create } from "zustand"

export type CategoryState = {
  id: string
  name: string
  icon: string
}

type StoreState = {
  // loading / error
  isLoading: boolean
  isLoadingIncomeCategories: boolean
  isLoadingExpenseCategories: boolean
  error?: string | null

  // data
  expenseCategories: CategoryState[]
  incomeCategories: CategoryState[]

  // actions
  addTransaction: (type: "income" | "expense", payload: any) => Promise<any>

  // category fetchers
  getIncomeCategories: () => Promise<CategoryState[] | null>
  getExpenseCategories: () => Promise<CategoryState[] | null>
  fetchAllCategories: () => Promise<void>

  // optional reset error
  resetError: () => void
}

export const useTransactionStore = create<StoreState>((set, get) => ({
  // initial state
  isLoading: false,
  isLoadingIncomeCategories: false,
  isLoadingExpenseCategories: false,
  error: null,
  expenseCategories: [],
  incomeCategories: [],

  addTransaction: async (type, payload) => {
    set({ isLoading: true, error: null })
    try {
      // mock async operation (replace with real API call)
      console.log("Adding transaction", type, JSON.stringify(payload, null, 2))

      const result = await fetch("http://localhost:3000/api/transactions", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ type, ...payload }),
      })

      if(!result.ok) {
        const text = await result.text()
        throw new Error(text || `Failed to add transaction: ${result.status}`)
      }
      const created = await result.json()
      return created;
    } catch (err: any) {
      set({ error: err?.message || "Failed to add transaction" })
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  // fetch income categories from API
  getIncomeCategories: async () => {
    const { incomeCategories } = get()
    // simple cache: if already loaded return
    if (incomeCategories && incomeCategories.length > 0) return incomeCategories

    set({ isLoadingIncomeCategories: true, error: null })
    try {
      const res = await fetch("http://localhost:3000/api/categories?type=income")
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Failed to fetch income categories: ${res.status}`)
      }
      const data: CategoryState[] = await res.json()
      set({ incomeCategories: data })
      return data
    } catch (err: any) {
      set({ error: err?.message || "Failed to fetch income categories" })
      return null
    } finally {
      set({ isLoadingIncomeCategories: false })
    }
  },

  // fetch expense categories from API
  getExpenseCategories: async () => {
    const { expenseCategories } = get()
    if (expenseCategories && expenseCategories.length > 0) return expenseCategories

    set({ isLoadingExpenseCategories: true, error: null })
    try {
      const res = await fetch("http://localhost:3000/api/categories?type=expense")
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Failed to fetch expense categories: ${res.status}`)
      }
      const data: CategoryState[] = await res.json()
      set({ expenseCategories: data })
      return data
    } catch (err: any) {
      set({ error: err?.message || "Failed to fetch expense categories" })
      return null
    } finally {
      set({ isLoadingExpenseCategories: false })
    }
  },

  // convenience: fetch both lists (call once on mount)
  fetchAllCategories: async () => {
    set({ isLoading: true, error: null })
    try {
      // run in parallel
      const [income, expense] = await Promise.all([
        get().getIncomeCategories(),
        get().getExpenseCategories(),
      ])
      // results are already saved into store by the individual functions
      return
    } catch (err: any) {
      set({ error: err?.message || "Failed to fetch categories" })
    } finally {
      set({ isLoading: false })
    }
  },

  resetError: () => set({ error: null }),
}))
