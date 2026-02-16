export interface AuthState {
  isAuthenticated: boolean;
  userName: string;
}


interface CategoryState { 
  categoryId: string;
  name: string, 
  icon: any, 
  totalAmount: number; 
  percentage: number 
}

interface monthHistoryState {
  day: number,
  income: number,
  expense: number,
}

interface yearHistoryState {
  month: number,
  income: number,
  expense: number,
}
export interface DashBoardStoreState {
  isLoading: boolean;
  isSummaryLoading: boolean;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  incomeByCategory: CategoryState[];
  expenseByCategory: CategoryState[];
  monthHistory: monthHistoryState[];
  yearHistory: yearHistoryState[];
  fetchSummary: (startDate: string, endDate: string) => Promise<void>;
  fetchMonthHistory: (year: number, month: number) => Promise<void>;
  fetchYearHistory: (year: number) => Promise<void>;
}