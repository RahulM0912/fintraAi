import { create } from "zustand";
import type {
  SummaryData,
  InsightsData,
  TrendPoint,
  BudgetsData,
  RecentTransaction,
  CategoryBreakdown,
} from "@/lib/server/dashboardData";

// ─── Dashboard store — stale-while-revalidate ───────────────────────────────────
//
// One request (`/api/dashboard`) hydrates everything the dashboard renders.
// Data survives navigation: coming back to the dashboard paints the cached
// state instantly while a background refresh runs. Components skeleton only on
// `!hydrated` (true first visit), never on revalidation.

interface DashboardResponse {
  summary: SummaryData;
  insights: InsightsData;
  trends: { months: number; points: TrendPoint[] };
  budgets: BudgetsData;
  recent: RecentTransaction[];
}

interface DashboardStoreState {
  /** First successful load done — cached data below is renderable. */
  hydrated: boolean;
  /** A refresh is in flight while cached data is on screen. */
  isRefreshing: boolean;

  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  incomeByCategory: CategoryBreakdown[];
  expenseByCategory: CategoryBreakdown[];
  insights: InsightsData | null;
  /** Always 12 months; the chart's 6M/12M toggle slices client-side. */
  trendPoints: TrendPoint[];
  budgets: BudgetsData | null;
  recentTransactions: RecentTransaction[];

  fetchDashboard: () => Promise<void>;
}

// Dedupe concurrent callers (page effect + transaction-added can race).
let inflight: Promise<void> | null = null;

export const useDashboardStore = create<DashboardStoreState>((set, get) => ({
  hydrated: false,
  isRefreshing: false,

  totalIncome: 0,
  totalExpense: 0,
  netBalance: 0,
  incomeByCategory: [],
  expenseByCategory: [],
  insights: null,
  trendPoints: [],
  budgets: null,
  recentTransactions: [],

  fetchDashboard: async () => {
    if (inflight) return inflight;

    inflight = (async () => {
      if (get().hydrated) set({ isRefreshing: true });
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error(`Failed to fetch dashboard: ${res.status}`);
        const data: DashboardResponse = await res.json();
        set({
          hydrated: true,
          totalIncome: data.summary.total.totalIncome,
          totalExpense: data.summary.total.totalExpense,
          netBalance: data.summary.total.netBalance,
          incomeByCategory: data.summary.incomeByCategory,
          expenseByCategory: data.summary.expenseByCategory,
          insights: data.insights,
          trendPoints: data.trends.points,
          budgets: data.budgets,
          recentTransactions: data.recent,
        });
      } catch (error) {
        // Keep whatever stale data is on screen; a failed refresh must not
        // blank the dashboard.
        console.error("Error fetching dashboard:", error);
      } finally {
        set({ isRefreshing: false });
        inflight = null;
      }
    })();

    return inflight;
  },
}));
