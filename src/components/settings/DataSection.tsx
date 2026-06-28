"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload, Database, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function DataSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/transactions/export", { cache: "no-store" });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fintra-transactions-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Export ready", { description: "Your transactions downloaded as CSV." });
    } catch (e: any) {
      toast.error("Couldn't export", { description: e?.message ?? "Try again." });
    } finally {
      setExporting(false);
    }
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: text,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Import failed (${res.status})`);

      const { imported = 0, skipped = 0 } = data;
      toast.success(`Imported ${imported} transaction${imported === 1 ? "" : "s"}`, {
        description: skipped > 0 ? `${skipped} row${skipped === 1 ? "" : "s"} skipped.` : undefined,
      });
      // Refresh dashboard widgets that listen for new activity.
      window.dispatchEvent(new Event("transaction-added"));
    } catch (e: any) {
      toast.error("Couldn't import", { description: e?.message ?? "Check the file format." });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Database className="h-4 w-4 text-[var(--ink-3)]" />
        <h2 className="font-sora text-sm font-semibold text-[var(--ink)]">Data</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 py-1">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--ink)]">Export to CSV</p>
            <p className="text-xs text-[var(--ink-3)] mt-0.5">
              Download every transaction as a spreadsheet.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
            className="shrink-0 cursor-pointer"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export
          </Button>
        </div>

        <div className="h-px bg-[var(--hairline)]" />

        <div className="flex items-center justify-between gap-4 py-1">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--ink)]">Import from CSV</p>
            <p className="text-xs text-[var(--ink-3)] mt-0.5">
              Columns: Date (YYYY-MM-DD), Type, Category, Amount, Description.
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
            }}
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="shrink-0 cursor-pointer"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Import
          </Button>
        </div>
      </div>
    </section>
  );
}
