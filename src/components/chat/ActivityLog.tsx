"use client";

import { Loader2, CheckCircle2 } from "lucide-react";
import type { ActivityItem } from "@/lib/chat/types";

interface Props {
  items: ActivityItem[];
  size?: "sm" | "md";
}

export function ActivityLog({ items, size = "md" }: Props) {
  if (items.length === 0) return null;

  const isSm = size === "sm";
  const containerClass = isSm
    ? "rounded-md border border-border/60 bg-background/40 p-2"
    : "rounded-lg border border-border/60 bg-background/40 p-3";
  const headerClass = isSm
    ? "mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
    : "mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";
  const dotClass = isSm
    ? "inline-block h-1 w-1 animate-pulse rounded-full bg-indigo-500"
    : "inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500";
  const listClass = isSm ? "flex flex-col gap-1" : "flex flex-col gap-1.5";
  const itemClass = isSm
    ? "flex items-center gap-1.5 text-xs"
    : "flex items-center gap-2 text-sm";
  const iconClass = isSm ? "h-3 w-3 shrink-0" : "h-3.5 w-3.5 shrink-0";

  return (
    <div className={containerClass}>
      <div className={headerClass}>
        <span className={dotClass} />
        Working on it
      </div>
      <div className={listClass}>
        {items.map((item) => (
          <div key={item.id} className={itemClass}>
            {item.status === "active" ? (
              <Loader2 className={`${iconClass} animate-spin text-indigo-500`} />
            ) : (
              <CheckCircle2 className={`${iconClass} text-green-500`} />
            )}
            <span
              className={
                item.status === "done"
                  ? "text-muted-foreground line-through decoration-muted-foreground/40"
                  : "font-medium text-foreground/90"
              }
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
