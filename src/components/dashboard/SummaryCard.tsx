import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useDashboardStore } from "@/store/dashboardStore";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// A simple color palette — tweak to match your design system
const DEFAULT_COLORS = [
  "#60a5fa",
  "#34d399",
  "#f97316",
  "#f43f5e",
  "#a78bfa",
  "#fb7185",
  "#f59e0b",
  "#06b6d4",
];

export default function SummaryCard() {
  const {
    totalIncome,
    totalExpense,
    netBalance,
    incomeByCategory,
    expenseByCategory,
  } = useDashboardStore();

  // transform to recharts-friendly data
  const incomeData = incomeByCategory.map((c) => ({
    name: c.name,
    value: c.totalAmount,
    raw: c,
  }));

  const expenseData = expenseByCategory.map((c) => ({
    name: c.name,
    value: c.totalAmount,
    raw: c,
  }));

  const formatter = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  });

  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <Card>
        <CardContent>
          <div className="h-[340px] flex items-center justify-center">
            Loading summary...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex justify-between mb-4">
              <div className="bg-green-100 text-green-800 p-4 rounded-lg w-1/3 mr-2">
                <h3 className="text-sm font-medium">Total Income</h3>
                <p className="text-xl font-semibold">{totalIncome}</p>
              </div>
              <div className="bg-red-100 text-red-800 p-4 rounded-lg w-1/3 mr-2">
                <h3 className="text-sm font-medium">Total Expense</h3>
                <p className="text-xl font-semibold">{totalExpense}</p>
              </div>
              <div className="bg-blue-100 text-blue-800 p-4 rounded-lg w-1/3">
                <h3 className="text-sm font-medium">Net Balance</h3>
                <p className="text-xl font-semibold">{netBalance}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Income Pie */}
              <div>
                <h3 className="text-lg font-medium mb-2">Income by Category</h3>

                {incomeData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No income data</p>
                ) : (
                  <div className="flex gap-4 items-center justify-center">
                    <div className="w-1/2 h-48">
                      <ResponsiveContainer width="100%" height={192}>
                        <PieChart>
                          <Pie
                            data={incomeData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={64}
                            innerRadius={36}
                            paddingAngle={4}
                            label={({ percent, name }) => `${name} (${(percent! * 100).toFixed(0)}%)`}
                          >
                            {incomeData.map((_, i) => (
                              <Cell key={`cell-${i}`} fill={DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => formatter.format(Number(value))} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex-1">
                      {incomeData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2 mb-2">
                          <span
                            className="inline-block w-3 h-3 rounded-sm"
                            style={{ background: DEFAULT_COLORS[i % DEFAULT_COLORS.length] }}
                          />
                          <div className="text-sm">
                            <div className="font-medium">{d.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatter.format(d.value)} — {((d.value / (totalIncome || 1)) * 100).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Expense Pie */}
              <div>
                <h3 className="text-lg font-medium mb-2">Expense by Category</h3>

                {expenseData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No expense data</p>
                ) : (
                  <div className="flex gap-4 items-center justify-center">
                    <div className="w-1/2 h-48">
                      <ResponsiveContainer width="100%" height={192}>
                        <PieChart>
                          <Pie
                            data={expenseData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={64}
                            innerRadius={36}
                            paddingAngle={4}
                            label={({ percent, name }) => `${name} (${(percent! * 100).toFixed(0)}%)`}
                          >
                            {expenseData.map((_, i) => (
                              <Cell key={`cell-exp-${i}`} fill={DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => formatter.format(Number(value))} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex-1">
                      {expenseData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2 mb-2">
                          <span
                            className="inline-block w-3 h-3 rounded-sm"
                            style={{ background: DEFAULT_COLORS[i % DEFAULT_COLORS.length] }}
                          />
                          <div className="text-sm">
                            <div className="font-medium">{d.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatter.format(d.value)} — {((d.value / (totalExpense || 1)) * 100).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
