"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, TrendingUp, AlertCircle } from "lucide-react";

export function HistoryCard() {
  return (
    <Card className="overflow-hidden border-[var(--brand-border)] shadow-sm relative group bg-[var(--surface)]">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-bg)] to-transparent pointer-events-none" />
      <CardContent className="p-6 relative">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[var(--brand)] flex items-center justify-center text-white shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-sora font-semibold text-base text-[var(--ink)]">AI Insight</h3>
            <p className="text-sm text-[var(--ink-2)] leading-relaxed">
              You&apos;re spending <span className="font-medium text-orange-600 dark:text-orange-400">20% more on food</span> this month compared to last month. Consider cutting back on dining out to stay within your goal.
            </p>
            <div className="flex items-center gap-4 mt-3">
              <button className="cursor-pointer text-xs font-medium text-[var(--brand)] hover:underline flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Analyze Patterns
              </button>
              <button className="cursor-pointer text-xs font-medium text-[var(--ink-2)] hover:underline flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Set Budget
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
