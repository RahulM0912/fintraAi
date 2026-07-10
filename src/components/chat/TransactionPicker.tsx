"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, X } from "lucide-react";
import type { DisambiguateInterrupt, DisambiguateResume } from "@/lib/chat/types";

interface Props {
  data: DisambiguateInterrupt;
  onResolve: (resume: DisambiguateResume) => void;
  disabled?: boolean;
}

function formatAmount(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function TransactionPicker({ data, onResolve, disabled }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const ActionIcon = data.action === "delete" ? Trash2 : Pencil;
  const actionLabel = data.action === "delete" ? "Delete" : "Edit";
  const accent =
    data.action === "delete"
      ? "border-[var(--neg)]/40 bg-[var(--neg-bg)]/60"
      : "border-[var(--brand-border)] bg-[var(--brand-bg)]/60";

  return (
    <div className={`mt-3 rounded-lg border ${accent} p-3`}>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ActionIcon className="h-3.5 w-3.5" />
        {data.question}
      </div>

      <div className="flex flex-col gap-1.5">
        {data.candidates.map((c) => {
          const isSelected = selectedId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              disabled={disabled}
              onClick={() => setSelectedId(c.id)}
              className={`flex cursor-pointer flex-col items-start gap-0.5 rounded-lg border bg-background p-2.5 text-left text-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected ? "border-primary ring-2 ring-primary/30" : "border-border"
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="font-medium">{c.category}</span>
                <span className={`tnum font-semibold ${c.type === "expense" ? "text-[var(--neg)]" : "text-[var(--pos)]"}`}>
                  {c.type === "expense" ? "−" : "+"}{formatAmount(c.amount)}
                </span>
              </div>
              <div className="text-muted-foreground">
                <span className="tabular-nums">{c.date}</span>
                {c.description ? <span className="ml-2">· {c.description}</span> : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-2.5 flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onResolve({ kind: "disambiguate_transaction", selectedId: null })}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={disabled || !selectedId}
          variant={data.action === "delete" ? "destructive" : "default"}
          onClick={() =>
            selectedId &&
            onResolve({ kind: "disambiguate_transaction", selectedId })
          }
        >
          {actionLabel} this
        </Button>
      </div>
    </div>
  );
}
