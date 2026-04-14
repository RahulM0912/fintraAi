"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, TrendingUp, AlertCircle } from "lucide-react";

export function HistoryCard() {
  return (
    <Card className="overflow-hidden border-indigo-100 dark:border-indigo-900/50 shadow-sm relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-purple-50/50 to-pink-50/50 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-pink-950/20 pointer-events-none" />
      <CardContent className="p-6 relative">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">AI Insight</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              You're spending <span className="font-medium text-orange-600 dark:text-orange-400">20% more on food</span> this month compared to last month. Consider cutting back on dining out to stay within your goal.
            </p>
            <div className="flex items-center gap-4 mt-3">
              <button className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Analyze Patterns
              </button>
              <button className="text-xs font-medium text-gray-500 hover:underline flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Set Budget
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
