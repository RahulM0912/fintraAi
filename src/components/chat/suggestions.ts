import { PlusCircle, PieChart, TrendingUp, Search } from "lucide-react";
import type { ChipSuggestion } from "./SuggestionChips";
import type { Message } from "@/lib/chat/types";

// Mutation chips PREFILL an editable template (mode "prefill") — clicking a
// chip must never log a made-up amount. Read-only queries send immediately.
export const PAGE_SUGGESTIONS: ChipSuggestion[] = [
  { label: "Add expense",         prompt: "Add ₹100 for food today",                                icon: PlusCircle, description: "Fills a template — edit & send", mode: "prefill" },
  { label: "Monthly summary",     prompt: "Show me a summary of this month's spending",             icon: PieChart,   description: "Category breakdown" },
  { label: "Top spending",        prompt: "Where did I spend the most this month?",                 icon: TrendingUp, description: "Spending analysis" },
  { label: "Recent transactions", prompt: "Show my last 10 transactions",                           icon: Search,     description: "View transactions" },
  { label: "Bulk add",            prompt: "₹100 food, ₹50 transport, ₹500 rent — all today",        icon: PlusCircle, description: "Fills a template — edit & send", mode: "prefill" },
  { label: "Yearly trends",       prompt: "Show my income vs expense trend for this year",          icon: TrendingUp, description: "Year overview" },
];

export const ASSISTANT_SUGGESTIONS: ChipSuggestion[] = [
  { label: "Add an expense",             prompt: "Add ₹100 for food today", icon: PlusCircle, mode: "prefill" },
  { label: "Show this month's spending", icon: PieChart   },
  { label: "Where did I spend the most?", icon: TrendingUp },
];

// Welcomes are UI chrome rendered by each surface — never part of the shared
// session, never sent to the API. The page gets the full pitch; the compact
// widget gets one line.
export const CHAT_WELCOME: Message = {
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

export const MODAL_WELCOME: Message = {
  role: "ai",
  content:
    "I read your ledger and act on it — tell me what you spent, or ask where the money went.",
};
