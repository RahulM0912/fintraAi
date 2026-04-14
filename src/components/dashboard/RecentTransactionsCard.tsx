import Link from "next/link";
import React, { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Coffee, ShoppingBag, Car, ArrowUpRight, Home, Smartphone, HelpCircle } from "lucide-react";
import { useDashboardStore } from "@/store/dashboardStore";
import { format } from "date-fns";

const IconMap: Record<string, any> = {
  Coffee,
  ShoppingBag,
  Car,
  Home,
  ArrowUpRight,
  Smartphone
};

export function RecentTransactionsCard() {
  const { recentTransactions, isRecentTransactionsLoading, fetchRecentTransactions } = useDashboardStore();

  useEffect(() => {
    fetchRecentTransactions();
    
    const handleTransactionChange = () => {
      fetchRecentTransactions();
    };
    window.addEventListener("transaction-added", handleTransactionChange);
    return () => window.removeEventListener("transaction-added", handleTransactionChange);
  }, [fetchRecentTransactions]);

  if (isRecentTransactionsLoading) {
    return (
      <Card className="bg-white dark:bg-zinc-900 border-none shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2rem] h-full">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-14" />
          </div>
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-zinc-900 border-none shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2rem] h-full relative z-0 overflow-hidden">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[17px] font-bold text-gray-800 dark:text-gray-100 tracking-tight">Recent Transactions</h2>
          <Link href="/transactions" className="text-[11px] font-bold text-[#4338ca] dark:text-indigo-400 hover:text-indigo-800 tracking-wide transition-colors uppercase">
            View All
          </Link>
        </div>

        <div className="space-y-6">
          {recentTransactions && recentTransactions.length > 0 ? recentTransactions.map((t) => {
            const Icon = IconMap[t.category?.icon] || HelpCircle;
            
            return (
              <div key={t.id} className="relative flex items-center justify-between group">
                <div className="flex items-center gap-4 relative w-full overflow-hidden mt-1 mb-1">
                  {/* Colored Line */}
                  <div className={`absolute -left-0 top-1 bottom-1 w-1 rounded-full ${t.type === 'expense' ? 'bg-[#b62436]' : 'bg-[#1b8040]'}`} />
                  
                  {/* Icon Box */}
                  <div className="ml-5 h-10 w-10 shrink-0 bg-gray-100/80 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-gray-500 text-lg">
                    {t.category?.icon ? (
                      IconMap[t.category.icon] ? <Icon className="h-4 w-4" /> : <span>{t.category.icon}</span>
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-0.5 truncate">
                    <p className="font-semibold text-[14px] text-gray-900 dark:text-gray-100 truncate">{t.description || t.category?.name || 'Transaction'}</p>
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase truncate">
                      {t.date ? format(new Date(t.date), "dd MMM") : ''} • {t.category?.name || 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className={`font-bold text-[14px] tracking-tight shrink-0 flex items-center gap-0.5 whitespace-nowrap ml-4 ${t.type === 'expense' ? 'text-[#b62436]' : 'text-[#1b8040]'}`}>
                  <span>{t.type === 'expense' ? '-' : '+'}</span>
                  <span>₹{(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )
          }) : (
            <div className="text-sm text-center text-gray-400 py-8">No recent transactions</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
