import { DashBoardStoreState } from "@/types/store";
import { create } from "zustand";

export const useDashboardStore = create<DashBoardStoreState>((set) => ({
  isSummaryLoading: false,
  isLoading: false,
  totalIncome: 0,
  totalExpense: 0,
  netBalance: 0,
  incomeByCategory: [],
  expenseByCategory: [],
  monthHistory: [],
  yearHistory: [],

  fetchSummary: async (startDate: string, endDate: string) => {
    try {
      set({ isSummaryLoading: true });
      const response = await fetch(`/api/summary?startDate=${startDate}&endDate=${endDate}`)
      if(!response.ok) {
        const text = response.statusText || `Failed to fetch summary: ${response.status}`
        throw new Error(text)
      }
      const data = await response.json();
      const totalIncome = data.total.totalIncome
      const totalExpense = data.total.totalExpense
      const netBalance = data.total.netBalance
      const incomeByCategory = data.incomeByCategory
      const expenseByCategory = data.expenseByCategory
      set({ totalIncome, totalExpense, netBalance, incomeByCategory, expenseByCategory });
    } catch (error) {
      console.error("Error fetching summary:", error);
      set({ totalIncome: 0, totalExpense: 0, netBalance: 0, incomeByCategory: [], expenseByCategory: [] });
    } finally {
      set({ isSummaryLoading: false })
    }
  },

  fetchMonthHistory: async (year: number, month: number) => {
    try {
      set({ isLoading: true });
      const response = await fetch(`/api/history?year=${year}&month=${month}`)
      if(!response.ok) {
        const text = response.statusText || `Failed to fetch month history: ${response.status}`
        throw new Error(text)
      }
      const data = await response.json();
      const monthHistory = data.days
      set({ monthHistory });
    } catch (error) {
      console.error("Error fetching month history:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchYearHistory: async (year: number) => {
    try {
      set({ isLoading: true });
      const response = await fetch(`/api/history/year?year=${year}`)
      if(!response.ok) {
        const text = response.statusText || `Failed to fetch year history: ${response.status}`
        throw new Error(text)
      }
      const data = await response.json();
      const yearHistory = data.months
      set({ yearHistory });
    } catch (error) {
      console.error("Error fetching year history:", error);
    } finally {
      set({ isLoading: false });
    }
  }
}))