// src/store/transactionStore.ts
import { create } from "zustand"

export type CategoryState = {
  id: string
  name: string
  icon: string
}

type StoreState = {
  isLoading: boolean
  isLoadingIncomeCategories: boolean
  isLoadingExpenseCategories: boolean
  error?: string | null

  expenseCategories: CategoryState[]
  incomeCategories: CategoryState[]

  // fetched flags — prevent infinite re-fetch when API returns []
  incomeCategoriesFetched: boolean
  expenseCategoriesFetched: boolean

  addTransaction: (type: "income" | "expense", payload: any) => Promise<any>
  getIncomeCategories: () => Promise<CategoryState[] | null>
  getExpenseCategories: () => Promise<CategoryState[] | null>
  fetchAllCategories: () => Promise<void>
  resetError: () => void
}

export const useTransactionStore = create<StoreState>((set, get) => ({
  isLoading: false,
  isLoadingIncomeCategories: false,
  isLoadingExpenseCategories: false,
  error: null,
  expenseCategories: [],
  incomeCategories: [],
  incomeCategoriesFetched: false,
  expenseCategoriesFetched: false,

  addTransaction: async (type, payload) => {
    set({ isLoading: true, error: null })
    try {
      const result = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...payload }),
      })
      if (!result.ok) {
        const text = await result.text()
        console.error(`[addTransaction] ${result.status} response:`, text)
        throw new Error(text || `Failed to add transaction: ${result.status}`)
      }
      return await result.json()
    } catch (err: any) {
      set({ error: err?.message || "Failed to add transaction" })
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  getIncomeCategories: async () => {
    const { incomeCategoriesFetched, incomeCategories } = get()
    if (incomeCategoriesFetched) return incomeCategories

    set({ isLoadingIncomeCategories: true, error: null })
    try {
      const res = await fetch("/api/categories?type=income")
      if (!res.ok) throw new Error(`Failed to fetch income categories: ${res.status}`)
      const data: CategoryState[] = await res.json()
      set({ incomeCategories: data, incomeCategoriesFetched: true })
      return data
    } catch (err: any) {
      set({ error: err?.message || "Failed to fetch income categories" })
      return null
    } finally {
      set({ isLoadingIncomeCategories: false })
    }
  },

  getExpenseCategories: async () => {
    const { expenseCategoriesFetched, expenseCategories } = get()
    if (expenseCategoriesFetched) return expenseCategories

    set({ isLoadingExpenseCategories: true, error: null })
    try {
      const res = await fetch("/api/categories?type=expense")
      if (!res.ok) throw new Error(`Failed to fetch expense categories: ${res.status}`)
      const data: CategoryState[] = await res.json()
      set({ expenseCategories: data, expenseCategoriesFetched: true })
      return data
    } catch (err: any) {
      set({ error: err?.message || "Failed to fetch expense categories" })
      return null
    } finally {
      set({ isLoadingExpenseCategories: false })
    }
  },

  fetchAllCategories: async () => {
    set({ isLoading: true, error: null })
    try {
      await Promise.all([get().getIncomeCategories(), get().getExpenseCategories()])
    } catch (err: any) {
      set({ error: err?.message || "Failed to fetch categories" })
    } finally {
      set({ isLoading: false })
    }
  },

  resetError: () => set({ error: null }),
}))
