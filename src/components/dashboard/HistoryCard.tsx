"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/store/dashboardStore";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { addMonths } from "date-fns"; // only for safe month increment if needed

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function HistoryCard() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [isMonthly, setIsMonthly] = useState<boolean>(true);
  const [showIncome, setShowIncome] = useState<boolean>(true);
  const [showExpense, setShowExpense] = useState<boolean>(true);

  const {
    monthHistory, // expected: [{ day: 1, income: 100, expense: 100 }, ...]
    yearHistory,  // expected: [{ month: 1, income: 10000, expense: 1000 }, ...]
    fetchMonthHistory,
    fetchYearHistory,
  } = useDashboardStore();

  // fetch when year/month change or view toggles
  useEffect(() => {
    if (isMonthly) {
      fetchMonthHistory(year, month);
    } else {
      fetchYearHistory(year);
    }
  }, [isMonthly, year, month, fetchMonthHistory, fetchYearHistory]);

  // transform monthHistory -> full days array for chart (1..daysInMonth)
  const chartDataForMonth = useMemo(() => {
    if (!isMonthly) return [];

    // days in month: new Date(year, month, 0).getDate() works with month 1..12
    const daysInMonth = new Date(year, month, 0).getDate();

    const mapByDay = new Map<number, { income: number; expense: number }>();
    (monthHistory || []).forEach((r: any) => {
      // ensure numbers
      mapByDay.set(Number(r.day), {
        income: Number(r.income || 0),
        expense: Number(r.expense || 0),
      });
    });

    const arr = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const found = mapByDay.get(day) ?? { income: 0, expense: 0 };
      return {
        day: String(day).padStart(2, "0"), // "01", "02" matching your screenshot labels
        income: found.income,
        expense: found.expense,
      };
    });

    return arr;
  }, [isMonthly, monthHistory, year, month]);

  // transform yearHistory -> 12 months array
  const chartDataForYear = useMemo(() => {
    if (isMonthly) return [];

    const mapByMonth = new Map<number, { income: number; expense: number }>();
    (yearHistory || []).forEach((r: any) => {
      mapByMonth.set(Number(r.month), {
        income: Number(r.income || 0),
        expense: Number(r.expense || 0),
      });
    });

    const arr = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const found = mapByMonth.get(m) ?? { income: 0, expense: 0 };
      return {
        month: m,
        monthLabel: MONTH_NAMES[i],
        income: found.income,
        expense: found.expense,
      };
    });

    return arr;
  }, [isMonthly, yearHistory]);

  const chartData = isMonthly ? chartDataForMonth : chartDataForYear;

  // simple year options (5 years: current .. -4)
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Controls row */}
          <div className="flex items-center gap-3">
            {/* view toggles */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isMonthly ? "default" : "ghost"}
                onClick={() => setIsMonthly(true)}
              >
                Month
              </Button>
              <Button
                size="sm"
                variant={!isMonthly ? "default" : "ghost"}
                onClick={() => setIsMonthly(false)}
              >
                Year
              </Button>
            </div>

            {/* year select */}
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="ml-2 rounded-md border px-2 py-1 bg-background text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {/* month select (only when monthly view) */}
            {isMonthly && (
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="ml-2 rounded-md border px-2 py-1 bg-background text-sm"
              >
                {MONTH_NAMES.map((mName, idx) => (
                  <option key={mName} value={idx + 1}>
                    {mName}
                  </option>
                ))}
              </select>
            )}

            <div className="ml-auto flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showIncome}
                  onChange={(e) => setShowIncome(e.target.checked)}
                />
                <span>Income</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showExpense}
                  onChange={(e) => setShowExpense(e.target.checked)}
                />
                <span>Expense</span>
              </label>
            </div>
          </div>

          {/* Chart */}
          <div className="w-full h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData as any}
                margin={{ top: 16, right: 24, left: 8, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey={isMonthly ? "day" : "monthLabel"}
                  tick={{ fontSize: 12 }}
                  interval={isMonthly ? 0 : "preserveEnd"}
                />
                <YAxis />
                <Tooltip formatter={(value: number) => new Intl.NumberFormat("en-IN").format(value)} />
                <Legend />
                {showIncome && (
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#10b981" /* green */
                    barSize={isMonthly ? 12 : 18}
                    radius={[4, 4, 0, 0]}
                  />
                )}
                {showExpense && (
                  <Bar
                    dataKey="expense"
                    name="Expense"
                    fill="#ef4444" /* red */
                    barSize={isMonthly ? 12 : 18}
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
