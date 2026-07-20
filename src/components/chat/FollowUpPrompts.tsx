"use client";

import { ArrowUpRight } from "lucide-react";
import type { FollowUp } from "@/lib/chat/followUpSuggestions";

/* Suggested next questions under the AI's last answer — Claude's plain
   clickable-row pattern rather than an icon+description chip: the prompt
   text itself is the label, one per row, arrow nudges on hover. */

interface Props {
  items: FollowUp[];
  disabled?: boolean;
  onSelect: (prompt: string, mode: "send" | "prefill") => void;
}

export function FollowUpPrompts({ items, disabled, onSelect }: Props) {
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {items.map((item) => (
        <button
          key={item.prompt}
          onClick={() => onSelect(item.prompt, item.mode)}
          disabled={disabled}
          className="group flex items-center justify-between gap-2 rounded-lg border border-[var(--hairline)] px-3 py-2 text-left text-sm text-[var(--ink)] transition-colors duration-150 ease-out hover:border-[var(--hairline-strong)] hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>{item.prompt}</span>
          <ArrowUpRight
            className="h-3.5 w-3.5 shrink-0 text-[var(--ink-3)] transition-transform duration-150 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}
