"use client";

import { CheckCircle2 } from "lucide-react";
import type { InterruptPayload, InterruptResume } from "@/lib/chat/types";
import { TransactionPicker } from "./TransactionPicker";
import { DestructiveConfirmation, LargeAmountConfirmation } from "./ConfirmationCard";

interface Props {
  payload: InterruptPayload;
  resolved: boolean;
  disabled?: boolean;
  onResolve: (resume: InterruptResume) => void;
}

export function InterruptCard({ payload, resolved, disabled, onResolve }: Props) {
  if (resolved) {
    return (
      <div className="mt-3 flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500/80" />
        Response recorded
      </div>
    );
  }

  switch (payload.kind) {
    case "disambiguate_transaction":
      return (
        <TransactionPicker
          data={payload}
          disabled={disabled}
          onResolve={(r) => onResolve(r)}
        />
      );
    case "confirm_destructive":
      return (
        <DestructiveConfirmation
          data={payload}
          disabled={disabled}
          onResolve={(r) => onResolve(r)}
        />
      );
    case "confirm_large_amount":
      return (
        <LargeAmountConfirmation
          data={payload}
          disabled={disabled}
          onResolve={(r) => onResolve(r)}
        />
      );
  }
}
