"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { AlertTriangle, Info, Lightbulb, OctagonAlert } from "lucide-react";

// Tables are rendered via a custom parser so they NEVER depend on remark-gfm
// loading correctly under Turbopack SSR. Everything else uses ReactMarkdown.
//
// Pipeline: unflattenTables → normaliseTableLines → splitBlocks → JSX

// ─── Inline bold/italic for table cells ──────────────────────────────────────

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}

// ─── Unflatten concatenated tables ───────────────────────────────────────────
// Some models emit an entire table on a single line (header + separator + every
// data row glued together). Detect a separator-cell run inside a line and split
// the header / separator / data-rows onto their own lines.

function unflattenTables(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      // Separator cell pattern: at least 2 dashes between pipes, ≥ 2 cells
      const sepMatch = line.match(
        /\|\s*-{2,}[\-:\s]*(?:\|\s*-{2,}[\-:\s]*)+\|/
      );
      if (!sepMatch) return line;

      const sepStart = sepMatch.index ?? 0;
      const sepEnd = sepStart + sepMatch[0].length;
      const before = line.slice(0, sepStart).trim();
      const sep = sepMatch[0].trim();
      const after = line.slice(sepEnd).trim();

      // Number of cells in the header tells us how to chunk data rows
      const headerCells = before.split("|").filter((c) => c.trim()).length;
      if (headerCells === 0) return line;

      const parts: string[] = [];
      if (before) parts.push(before);
      parts.push(sep);

      if (after) {
        // Each data row matches `|cell|cell|...|cell|` with `headerCells` cells
        const rowRegex = new RegExp(
          `\\|(?:[^|]*\\|){${headerCells}}`,
          "g"
        );
        const rows = [...after.matchAll(rowRegex)].map((m) => m[0].trim());
        if (rows.length) {
          parts.push(...rows);
        } else {
          parts.push(after);
        }
      }

      return parts.join("\n");
    })
    .join("\n");
}

// ─── Table normaliser ────────────────────────────────────────────────────────

function normaliseTableLines(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if ((t.match(/\|/g) ?? []).length < 2) return line;
      let out = t;
      if (!out.startsWith("|")) out = `| ${out}`;
      if (!out.endsWith("|")) out = `${out} |`;
      if (/^[\|\-\:\s]+$/.test(out) && out.includes("-")) {
        const cols = out.split("|").filter((s) => s.trim()).length;
        out = `|${Array(cols).fill(" --- ").join("|")}|`;
      }
      return out;
    })
    .join("\n");
}

// ─── Block splitter ──────────────────────────────────────────────────────────

function parseRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function isSep(line: string): boolean {
  const t = line.trim();
  return t.includes("-") && /^[\|\-\:\s]+$/.test(t);
}

interface TableBlock {
  type: "table";
  headers: string[];
  rows: string[][];
}
interface TextBlock {
  type: "text";
  text: string;
}
type AlertVariant = "warning" | "caution" | "tip" | "note";
interface AlertBlock {
  type: "alert";
  variant: AlertVariant;
  text: string;
}
type Block = TableBlock | TextBlock | AlertBlock;

// ─── Alert blockquote parser ─────────────────────────────────────────────────
// Matches GitHub-flavored alerts:
//   > [!WARNING]
//   > body
//   > body
// Or single-line: `> [!TIP] body`. The first line of the blockquote must contain
// the marker, and the alert ends at the first non-`>` (or blank) line.

const ALERT_TYPES: Record<string, AlertVariant> = {
  WARNING: "warning",
  CAUTION: "caution",
  TIP: "tip",
  NOTE: "note",
  INSIGHT: "note",
  IMPORTANT: "warning",
};

function parseAlertStart(line: string): { variant: AlertVariant; rest: string } | null {
  const m = line.match(/^\s*>\s*\[!(\w+)\]\s*(.*)$/);
  if (!m) return null;
  const variant = ALERT_TYPES[m[1].toUpperCase()];
  if (!variant) return null;
  return { variant, rest: m[2].trim() };
}

function stripQuote(line: string): string | null {
  const m = line.match(/^\s*>\s?(.*)$/);
  return m ? m[1] : null;
}

function splitBlocks(content: string): Block[] {
  const lines = content.split("\n");
  const blocks: Block[] = [];
  const buf: string[] = [];

  const flush = () => {
    const t = buf.join("\n").trim();
    if (t) blocks.push({ type: "text", text: t });
    buf.length = 0;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const pipes = (trimmed.match(/\|/g) ?? []).length;

    // Alert blockquote: `> [!WARNING]` (optional inline body) followed by
    // any number of `> ...` continuation lines.
    const alertStart = parseAlertStart(line);
    if (alertStart) {
      flush();
      const bodyParts: string[] = [];
      if (alertStart.rest) bodyParts.push(alertStart.rest);
      i++;
      while (i < lines.length) {
        const stripped = stripQuote(lines[i]);
        if (stripped === null) break;
        bodyParts.push(stripped);
        i++;
      }
      blocks.push({
        type: "alert",
        variant: alertStart.variant,
        text: bodyParts.join("\n").trim(),
      });
      continue;
    }

    if (pipes >= 2) {
      let sepIdx = -1;
      for (let k = i + 1; k <= Math.min(i + 2, lines.length - 1); k++) {
        const next = lines[k].trim();
        if (next === "") continue;
        if (isSep(next)) sepIdx = k;
        break;
      }

      if (sepIdx !== -1) {
        flush();
        const headers = parseRow(trimmed);
        i = sepIdx + 1;

        const rows: string[][] = [];
        while (i < lines.length) {
          const l = lines[i].trim();
          if (!l || (l.match(/\|/g) ?? []).length < 1) break;
          rows.push(parseRow(lines[i]));
          i++;
        }

        blocks.push({ type: "table", headers, rows });
        continue;
      }
    }

    buf.push(line);
    i++;
  }

  flush();
  return blocks;
}

// ─── Table JSX ───────────────────────────────────────────────────────────────

function MdTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-xs">
        <thead className="bg-background/60">
          <tr>
            {headers.map((h, j) => (
              <th
                key={j}
                className="border-r border-border px-3 py-2 text-left font-semibold text-foreground last:border-r-0"
              >
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, j) => (
            <tr
              key={j}
              className="border-b border-border last:border-b-0 hover:bg-background/30"
            >
              {row.map((cell, k) => (
                <td
                  key={k}
                  className="border-r border-border px-3 py-2 last:border-r-0"
                >
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Alert JSX ───────────────────────────────────────────────────────────────

const ALERT_STYLES: Record<
  AlertVariant,
  { container: string; icon: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  warning: {
    container:
      "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100",
    icon: "text-red-500 dark:text-red-400",
    Icon: AlertTriangle,
  },
  caution: {
    container:
      "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-100",
    icon: "text-rose-600 dark:text-rose-400",
    Icon: OctagonAlert,
  },
  tip: {
    container:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100",
    icon: "text-emerald-600 dark:text-emerald-400",
    Icon: Lightbulb,
  },
  note: {
    container:
      "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-100",
    icon: "text-sky-600 dark:text-sky-400",
    Icon: Info,
  },
};

function MdAlert({ variant, text }: { variant: AlertVariant; text: string }) {
  const { container, icon, Icon } = ALERT_STYLES[variant];
  return (
    <div
      className={`my-2 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] leading-snug ${container}`}
      role="note"
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${icon}`} />
      <div className="min-w-0 flex-1">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
}

// ─── ReactMarkdown components for non-table content ──────────────────────────

const markdownComponents: Components = {
  p:          ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
  strong:     ({ children }) => <strong className="font-semibold">{children}</strong>,
  em:         ({ children }) => <em className="italic">{children}</em>,
  h1:         ({ children }) => <h1 className="mb-2 text-base font-bold">{children}</h1>,
  h2:         ({ children }) => <h2 className="mb-1.5 font-bold">{children}</h2>,
  h3:         ({ children }) => <h3 className="mb-1 font-semibold">{children}</h3>,
  ul:         ({ children }) => <ul className="mb-1.5 list-disc space-y-0.5 pl-4">{children}</ul>,
  ol:         ({ children }) => <ol className="mb-1.5 list-decimal space-y-0.5 pl-4">{children}</ol>,
  li:         ({ children }) => <li>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-4 border-primary/40 pl-3 italic opacity-80">
      {children}
    </blockquote>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-md bg-background/50 p-3 font-mono text-xs">
      {children}
    </pre>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code: ({ className, children, ...props }: any) =>
    className ? (
      <code className={`${className} font-mono`} {...props}>{children}</code>
    ) : (
      <code className="rounded bg-background/50 px-1 py-0.5 font-mono text-xs" {...props}>
        {children}
      </code>
    ),
};

// ─── Public component ────────────────────────────────────────────────────────

export function MarkdownContent({ content }: { content: string }) {
  const blocks = splitBlocks(normaliseTableLines(unflattenTables(content)));

  return (
    <div className="space-y-1">
      {blocks.map((block, idx) => {
        if (block.type === "table") {
          return <MdTable key={idx} headers={block.headers} rows={block.rows} />;
        }
        if (block.type === "alert") {
          return <MdAlert key={idx} variant={block.variant} text={block.text} />;
        }
        return (
          <ReactMarkdown
            key={idx}
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {block.text}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}
