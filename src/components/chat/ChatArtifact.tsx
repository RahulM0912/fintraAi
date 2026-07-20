"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ChartPayload, DataTablePayload } from "@/lib/chat/types";
import { ChatChart } from "./ChatChart";
import { DataTable } from "./DataTable";

/* The data artifact under an AI answer. When the payload carries both a chart
   and a table, show one at a time behind a small Chart/Table switch (same
   underline-active affordance as the dashboard's 6M/12M range toggle) — the
   chart carries the shape, the table the exact numbers, and stacking both
   doubled the height of every answer. Chart is the default read. */

interface Props {
  chart?: ChartPayload;
  table?: DataTablePayload;
  compact?: boolean;
}

export function ChatArtifact({ chart, table, compact = false }: Props) {
  const [view, setView] = useState<"chart" | "table">("chart");

  if (!chart && !table) return null;
  if (!chart) return <DataTable table={table!} />;
  if (!table) return <ChatChart chart={chart} compact={compact} />;

  return (
    <div>
      <div
        className="mt-3 flex items-center justify-end gap-1"
        role="group"
        aria-label="Data view"
      >
        {(["chart", "table"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={cn(
              "px-2 py-1 text-xs capitalize transition-colors duration-150 ease-out",
              view === v
                ? "font-semibold text-[var(--ink)] underline decoration-[var(--brand)] decoration-2 underline-offset-4"
                : "text-[var(--ink-3)] hover:text-[var(--ink)]"
            )}
          >
            {v}
          </button>
        ))}
      </div>
      {/* -mt offsets the artifact's own my-3 so the switch sits tight above it */}
      <div className="-mt-2">
        {view === "chart" ? (
          <ChatChart chart={chart} compact={compact} />
        ) : (
          <DataTable table={table} />
        )}
      </div>
    </div>
  );
}
