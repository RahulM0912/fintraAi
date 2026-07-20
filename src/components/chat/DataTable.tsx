"use client";

import type { DataTablePayload } from "@/lib/chat/types";

/* Native table for the render fast-path: rows come straight from tool data
   (server render.ts), so values are exact — no model transcription. Styling
   mirrors MarkdownContent's MdTable so both table sources look identical. */

export function DataTable({ table }: { table: DataTablePayload }) {
  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-xs">
        <thead className="border-b border-border bg-background/60">
          <tr>
            {table.columns.map((h, j) => (
              <th
                key={j}
                className="border-r border-border px-3 py-2 text-left font-semibold text-foreground last:border-r-0"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, j) => (
            <tr
              key={j}
              className="border-b border-border last:border-b-0 hover:bg-background/30"
            >
              {row.map((cell, k) => (
                <td
                  key={k}
                  className="tnum border-r border-border px-3 py-2 last:border-r-0"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
