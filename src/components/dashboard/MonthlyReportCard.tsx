"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, setMonth, setYear } from "date-fns";

const EXPENSE_COLORS = ['#4f46e5', '#818cf8', '#c7d2fe', '#e0e7ff', '#a5b4fc', '#6366f1'];
const INCOME_COLORS = ['#16a34a', '#4ade80', '#bbf7d0', '#dcfce7', '#86efac', '#22c55e'];

export function MonthlyReportCard() {
  const [selectedChart, setSelectedChart] = useState<'expense' | 'income'>('expense');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<{incomeByCategory: any[], expenseByCategory: any[], total: any}>({
    incomeByCategory: [], expenseByCategory: [], total: { totalIncome: 0, totalExpense: 0, netBalance: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const fetchMonthlyData = () => {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      
      setIsLoading(true);
      fetch(`/api/summary?startDate=${start.toISOString()}&endDate=${end.toISOString()}&_t=${Date.now()}`, { cache: 'no-store' })
        .then(res => {
          if (!res.ok) throw new Error(`${res.status}`);
          return res.json();
        })
        .then(data => setReportData(data))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    };

    fetchMonthlyData();

    window.addEventListener("transaction-added", fetchMonthlyData);
    return () => window.removeEventListener("transaction-added", fetchMonthlyData);
  }, [currentDate, mounted]);

  const expenseData = useMemo(() => {
    return (reportData.expenseByCategory || []).map(cat => ({
      name: cat.name,
      value: Number(cat.percentage) || 0,
      amount: Number(cat.totalAmount) || 0
    }));
  }, [reportData]);

  const incomeData = useMemo(() => {
    return (reportData.incomeByCategory || []).map(cat => ({
      name: cat.name,
      value: Number(cat.percentage) || 0,
      amount: Number(cat.totalAmount) || 0
    }));
  }, [reportData]);

  const expenseFormatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(reportData.total.totalExpense || 0);
  const incomeFormatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(reportData.total.totalIncome || 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.name === 'None') return null;
      return (
        <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 p-2 rounded-lg shadow-lg text-xs">
          <p className="font-bold text-gray-800 dark:text-gray-200">{data.name}</p>
          <p className="text-gray-600 dark:text-gray-400">₹{(data.amount || 0).toLocaleString('en-IN')}</p>
          <p className="text-gray-500 dark:text-gray-500">{Math.round(data.value)}%</p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-zinc-900 border-none shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2rem] h-full flex flex-col">
        <CardContent className="p-8 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-5 w-36" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
          </div>

          {/* Pie charts row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-[100px] w-[100px] rounded-full" />
              </div>
            ))}
          </div>

          <Skeleton className="h-3 w-40 mx-auto mb-6" />
          <Skeleton className="h-px w-full mb-6" />

          {/* Category breakdown rows */}
          <Skeleton className="h-4 w-48 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-1 w-full rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-zinc-900 border-none shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2rem] h-full flex flex-col relative overflow-hidden">
      <CardContent className="p-8 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[17px] font-bold text-gray-800 dark:text-gray-100 tracking-tight">Monthly Report</h2>
          <div className="flex items-center gap-1">
            <button onClick={handlePrevMonth} className="p-1 text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {/* Clickable month/year — opens month picker */}
            <Popover open={pickerOpen} onOpenChange={(o) => {
              setPickerOpen(o)
              if (o) setPickerYear(currentDate.getFullYear())
            }}>
              <PopoverTrigger asChild>
                <button className="text-[10px] font-bold tracking-widest text-gray-400 uppercase w-20 text-center hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded px-1 py-0.5 hover:bg-muted">
                  {mounted ? format(currentDate, 'MMM yyyy') : '--'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="center">
                {/* Year navigator */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setPickerYear((y) => y - 1)}
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <span className="text-sm font-semibold">{pickerYear}</span>
                  <button
                    onClick={() => setPickerYear((y) => y + 1)}
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                {/* Month grid */}
                <div className="grid grid-cols-3 gap-1">
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((mon, i) => {
                    const isActive =
                      currentDate.getMonth() === i &&
                      currentDate.getFullYear() === pickerYear
                    return (
                      <button
                        key={mon}
                        onClick={() => {
                          setCurrentDate(setYear(setMonth(new Date(), i), pickerYear))
                          setPickerOpen(false)
                        }}
                        className={cn(
                          "text-xs py-1.5 rounded-md font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        {mon}
                      </button>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>

            <button onClick={handleNextMonth} className="p-1 text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-2">
          <div className="flex flex-col items-center">
            <h3 className="text-[9px] font-bold text-[#f87171] uppercase tracking-[0.2em] mb-1">Expenses</h3>
            <span className="text-xl font-bold text-[#dc2626] tracking-tight mb-4">- ₹{expenseFormatted}</span>
            
            <div 
              className={cn(
                "h-[100px] w-[100px] relative flex items-center justify-center p-1 cursor-pointer transition-all duration-300 rounded-full",
                selectedChart === 'expense' ? "shadow-[0_0_20px_rgba(79,70,229,0.3)] bg-indigo-50/10 dark:bg-indigo-900/10 scale-110" : "scale-100 opacity-90 hover:scale-105"
              )}
              onClick={() => setSelectedChart('expense')}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip 
                    content={<CustomTooltip />} 
                    allowEscapeViewBox={{ x: true, y: true }} 
                    wrapperStyle={{ zIndex: 1000 }} 
                    offset={15} 
                  />
                  <Pie
                    data={expenseData.length > 0 ? expenseData : [{ value: 100, name: 'None' }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={40}
                    paddingAngle={expenseData.length > 1 ? 2 : 0}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {expenseData.length > 0 ? expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                    )) : <Cell fill="#e5e7eb" />}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <h3 className="text-[9px] font-bold text-[#1b8040]/80 uppercase tracking-[0.2em] mb-1">Income</h3>
            <span className="text-xl font-bold text-[#1b8040] tracking-tight mb-4">₹{incomeFormatted}</span>
            
            <div 
              className={cn(
                "h-[100px] w-[100px] relative flex items-center justify-center p-1 cursor-pointer transition-all duration-300 rounded-full",
                selectedChart === 'income' ? "shadow-[0_0_20px_rgba(22,163,74,0.35)] bg-emerald-50/10 dark:bg-emerald-900/10 scale-110" : "scale-100 opacity-90 hover:scale-105"
              )}
              onClick={() => setSelectedChart('income')}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip 
                    content={<CustomTooltip />} 
                    allowEscapeViewBox={{ x: true, y: true }} 
                    wrapperStyle={{ zIndex: 1000 }} 
                    offset={15} 
                  />
                  <Pie
                    data={incomeData.length > 0 ? incomeData : [{ value: 100, name: 'None' }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={40}
                    paddingAngle={incomeData.length > 1 ? 2 : 0}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {incomeData.length > 0 ? incomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} />
                    )) : <Cell fill="#e5e7eb" />}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <p className="text-[9px] text-center text-gray-400 italic mb-6 mt-6">Click a chart to view breakdown</p>

        <hr className="border-gray-100 dark:border-zinc-800 mb-6" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-bold text-gray-800 dark:text-gray-100">
            Category Breakdown - {selectedChart === 'expense' ? 'Expenses' : 'Income'}
          </h3>
        </div>

        <div className="space-y-4 mb-0 overflow-y-auto max-h-48 pr-2 pb-2 custom-scrollbar">
          {(selectedChart === 'expense' ? expenseData : incomeData).map((category, i) => {
             const ColorArray = selectedChart === 'expense' ? EXPENSE_COLORS : INCOME_COLORS;
             const color = ColorArray[i % ColorArray.length];
             return (
              <div key={category.name}>
                <div className="flex justify-between items-end text-[11px] mb-1.5">
                  <span className="font-bold text-gray-700 dark:text-gray-300">{category.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-500 dark:text-gray-400">₹{(category.amount || 0).toLocaleString('en-IN')}</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">{Math.round(category.value)}%</span>
                  </div>
                </div>
                <div className="h-1 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden relative">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round(category.value)}%`, backgroundColor: color }} />
                </div>
              </div>
             )
          })}
          {(selectedChart === 'expense' ? expenseData : incomeData).length === 0 && (
             <div className="text-xs text-center text-gray-400 py-4">No data for this month</div>
          )}
        </div>

      </CardContent>
    </Card>
  )
}
