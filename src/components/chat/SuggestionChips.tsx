"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ChipSuggestion {
  label: string;
  prompt?: string;
  description?: string;
  icon: LucideIcon;
}

interface Props {
  suggestions: ChipSuggestion[];
  variant?: "pill" | "card";
  disabled?: boolean;
  onSelect: (prompt: string) => void;
}

export function SuggestionChips({ suggestions, variant = "pill", disabled, onSelect }: Props) {
  if (variant === "pill") {
    return (
      <div className="flex flex-wrap gap-2">
        {suggestions.map(({ label, prompt, icon: Icon }, idx) => (
          <Button
            key={idx}
            variant="outline"
            className="h-7 rounded-full px-3 text-xs"
            onClick={() => onSelect(prompt ?? label)}
            disabled={disabled}
          >
            <Icon className="mr-1.5 h-3.5 w-3.5" />
            {label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3">
      {suggestions.map(({ label, prompt, description, icon: Icon }, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(prompt ?? label)}
          disabled={disabled}
          className="flex cursor-pointer items-start gap-2 rounded-xl border bg-background px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <div className="font-medium">{label}</div>
            {description && (
              <div className="text-xs text-muted-foreground">{description}</div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
