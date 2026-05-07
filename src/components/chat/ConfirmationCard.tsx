"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, X, ShieldAlert } from "lucide-react";
import type {
  ConfirmDestructiveInterrupt,
  ConfirmLargeAmountInterrupt,
  ConfirmResume,
} from "@/lib/chat/types";

interface DestructiveProps {
  data: ConfirmDestructiveInterrupt;
  onResolve: (resume: ConfirmResume) => void;
  disabled?: boolean;
}

export function DestructiveConfirmation({ data, onResolve, disabled }: DestructiveProps) {
  return (
    <div className="mt-3 rounded-xl border-2 border-destructive/40 bg-destructive/5 p-3">
      <div className="mb-2 flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-destructive">
            {data.question}
          </div>
          <div className="mt-1 text-sm">{data.summary}</div>
          {data.affectedCount > 1 && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              This will affect {data.affectedCount} transactions.
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onResolve({ kind: "confirm_destructive", approved: false })}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={disabled}
          onClick={() => onResolve({ kind: "confirm_destructive", approved: true })}
        >
          <Check className="mr-1 h-3.5 w-3.5" />
          Confirm
        </Button>
      </div>
    </div>
  );
}

interface LargeAmountProps {
  data: ConfirmLargeAmountInterrupt;
  onResolve: (resume: ConfirmResume) => void;
  disabled?: boolean;
}

export function LargeAmountConfirmation({ data, onResolve, disabled }: LargeAmountProps) {
  return (
    <div className="mt-3 rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-3">
      <div className="mb-2 flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            {data.question}
          </div>
          <div className="mt-1 text-sm">
            {data.type === "expense" ? "Expense" : "Income"} of{" "}
            <span className="font-semibold">₹{data.amount.toLocaleString("en-IN")}</span>{" "}
            in {data.category} on {data.date}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onResolve({ kind: "confirm_large_amount", approved: false })}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={disabled}
          onClick={() => onResolve({ kind: "confirm_large_amount", approved: true })}
        >
          <Check className="mr-1 h-3.5 w-3.5" />
          Yes, add it
        </Button>
      </div>
    </div>
  );
}
