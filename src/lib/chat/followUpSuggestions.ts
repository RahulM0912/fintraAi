import type { Message } from "./types";

// Follow-up prompts shown under the AI's last answer — plain clickable
// questions (Claude's "suggested replies" pattern), not icon chips. Derived
// entirely client-side from the chart/table payload already on the message,
// so this costs zero LLM tokens and needed no server or SSE changes: the
// chart's typed `items` (real category names, real percentages) are enough.
// Returns null for plain prose answers — restraint over a prompt that
// doesn't fit every turn.

export interface FollowUp {
  prompt: string;
  mode: "send" | "prefill";
}

export function getFollowUpSuggestions(message: Message): FollowUp[] | null {
  const chart = message.chart;

  if (chart?.kind === "shares") {
    const top = chart.items[0]?.name;
    return [
      ...(top
        ? [{ prompt: `Set a ₹2000 monthly budget for ${top}`, mode: "prefill" as const }]
        : []),
      { prompt: "How does this compare to last month?", mode: "send" },
    ];
  }

  if (chart?.kind === "progress") {
    const overBudget = chart.items.find((i) => i.pct >= 80 && i.name !== "Overall");
    if (overBudget) {
      return [{ prompt: `Show my ${overBudget.name} transactions this month`, mode: "send" }];
    }
    return [{ prompt: "Set a ₹1000 monthly budget for ", mode: "prefill" }];
  }

  if (chart?.kind === "series") {
    if (chart.unit === "day") {
      return [
        { prompt: "How does this compare to last month?", mode: "send" },
        { prompt: "Set a ₹2000 monthly budget for food", mode: "prefill" },
      ];
    }
    return [
      { prompt: "Show me this month's spending", mode: "send" },
      { prompt: "Set a ₹2000 monthly budget for food", mode: "prefill" },
    ];
  }

  if (message.table?.title === "Transactions") {
    return [
      { prompt: "Add ₹100 for food today", mode: "prefill" },
      { prompt: "Show me a summary of this month's spending", mode: "send" },
    ];
  }

  return null;
}
