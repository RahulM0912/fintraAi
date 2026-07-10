import { PlusCircle, PieChart, TrendingUp, Search } from "lucide-react";
import type { ChipSuggestion } from "./SuggestionChips";
import type { Message } from "@/lib/chat/types";

export const PAGE_SUGGESTIONS: ChipSuggestion[] = [
  { label: "Add expense",         prompt: "Add ₹500 food expense today",                                            icon: PlusCircle, description: "Log a new transaction" },
  { label: "Monthly summary",     prompt: "Show me a summary of this month's spending",                              icon: PieChart,   description: "Category breakdown" },
  { label: "Top spending",        prompt: "Where did I spend the most this month?",                                  icon: TrendingUp, description: "Spending analysis" },
  { label: "Recent transactions", prompt: "Show my last 10 transactions",                                            icon: Search,     description: "View transactions" },
  { label: "Bulk add",            prompt: "Add these expenses: ₹500 food, ₹200 transport, ₹1000 rent — all today",   icon: PlusCircle, description: "Add multiple at once" },
  { label: "Yearly trends",       prompt: "Show my income vs expense trend for this year",                           icon: TrendingUp, description: "Year overview" },
];

export const ASSISTANT_SUGGESTIONS: ChipSuggestion[] = [
  { label: "Add ₹500 food expense today",       icon: PlusCircle },
  { label: "Show this month's spending",        icon: PieChart   },
  { label: "Where did I spend the most?",       icon: TrendingUp },
];

export const PAGE_WELCOME: Message = {
  role: "ai",
  content: `I read your ledger and act on it. Tell me what you spent and I'll log it; ask what happened and I'll explain the month.

A few things that work well:
• "Add ₹500 for food today" — logs it
• "₹500 food, ₹200 cab, ₹1000 rent — all today" — logs all three
• "Show last week's expenses" — pulls the records
• "Update my last food expense to ₹600" — edits it
• "Where did I spend most this month?" — names the culprit

I'll always check with you before deleting anything or moving a large amount.`,
};

export const ASSISTANT_WELCOME: Message = {
  role: "ai",
  content:
    "I read your ledger and act on it — tell me what you spent, or ask where the money went.",
};
