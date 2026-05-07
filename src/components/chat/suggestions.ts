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
  content: `Hi! I'm **Fintra AI**, your personal finance assistant.

Here's what I can do for you:
• **Add transactions** — "Add ₹500 for food today"
• **Bulk add** — "Add ₹500 food, ₹200 cab, ₹1000 rent today"
• **View & filter** — "Show last week's expenses"
• **Edit / delete** — "Update my last food expense to ₹600"
• **Analytics** — "Where did I spend most this month?"
• **Trends** — "Compare my spending this year vs last"

What would you like to do?`,
};

export const ASSISTANT_WELCOME: Message = {
  role: "ai",
  content:
    "Hi! I'm your Fintra AI assistant. I can add transactions, show spending summaries, and help you manage your finances. What would you like to do?",
};
