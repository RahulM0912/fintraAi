"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowRight,
} from "lucide-react";

type Tone = "warning" | "caution" | "tip" | "positive" | "note";

interface Insight {
  tone: Tone;
  title: string;
  detail: string;
  metric?: string;
}

interface Stat {
  label: string;
  value: string;
  tone: "pos" | "neg" | "neutral";
}

interface InsightResponse {
  hasData: boolean;
  primary: Insight | null;
  stats: Stat[];
}

// Per-tone visual treatment. `accent` drives the icon chip + metric; `glow` is
// the soft background wash so each insight reads at a glance.
const TONE: Record<
  Tone,
  { icon: React.ComponentType<{ className?: string }>; accent: string; chip: string; glow: string }
> = {
  warning: {
    icon: AlertTriangle,
    accent: "var(--neg)",
    chip: "var(--neg-bg)",
    glow: "var(--neg-bg)",
  },
  caution: {
    icon: AlertTriangle,
    accent: "#f59e0b",
    chip: "rgba(245,158,11,0.12)",
    glow: "rgba(245,158,11,0.10)",
  },
  tip: {
    icon: TrendingDown,
    accent: "var(--pos)",
    chip: "var(--pos-bg)",
    glow: "var(--pos-bg)",
  },
  positive: {
    icon: CheckCircle2,
    accent: "var(--pos)",
    chip: "var(--pos-bg)",
    glow: "var(--pos-bg)",
  },
  note: {
    icon: Info,
    accent: "var(--brand)",
    chip: "var(--brand-bg)",
    glow: "var(--brand-bg)",
  },
};

function askAssistant(prompt: string) {
  window.dispatchEvent(new CustomEvent("open-assistant", { detail: { prompt } }));
}

export function InsightCard() {
  const [data, setData] = useState<InsightResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const fetchInsight = () => {
      setIsLoading(true);
      fetch(`/api/insights?_t=${Date.now()}`, { cache: "no-store" })
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status}`);
          return res.json();
        })
        .then(setData)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    };
    fetchInsight();
    window.addEventListener("transaction-added", fetchInsight);
    return () => window.removeEventListener("transaction-added", fetchInsight);
  }, [mounted]);

  if (isLoading) {
    return (
      <Card className="bg-[var(--surface)] border border-[var(--hairline)] shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2rem]">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-10 w-10 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty / no-activity state — invite the first action.
  if (!data?.hasData || !data.primary) {
    return (
      <Card className="bg-[var(--surface)] border border-[var(--hairline)] shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2rem] overflow-hidden relative">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(135deg, var(--brand-bg), transparent 60%)" }}
        />
        <CardContent className="p-6 relative">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand)] text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-sora font-semibold text-base text-[var(--ink)]">AI Insight</h3>
              <p className="text-sm text-[var(--ink-2)] leading-relaxed mt-0.5">
                Log a few transactions and Fintra will spot trends, budget risks, and savings wins here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const insight = data.primary;
  const tone = TONE[insight.tone];
  const Icon = tone.icon;

  return (
    <Card className="bg-[var(--surface)] border border-[var(--hairline)] shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2rem] overflow-hidden relative">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: `linear-gradient(135deg, ${tone.glow}, transparent 55%)` }}
      />
      <CardContent className="p-6 relative">
        <div className="flex items-start gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm"
            style={{ backgroundColor: tone.chip, color: tone.accent }}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-3.5 w-3.5 text-[var(--brand)] shrink-0" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--ink-3)]">
                  AI Insight
                </span>
              </div>
              {insight.metric && (
                <span
                  className="font-sora text-sm font-bold tabular-nums shrink-0"
                  style={{ color: tone.accent }}
                >
                  {insight.metric}
                </span>
              )}
            </div>

            <h3 className="font-sora font-semibold text-[15px] text-[var(--ink)] mt-1.5">
              {insight.title}
            </h3>
            <p className="text-sm text-[var(--ink-2)] leading-relaxed mt-1">{insight.detail}</p>

            {/* Stat chips */}
            {data.stats.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {data.stats.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium"
                  >
                    <span className="text-[var(--ink-3)]">{s.label}</span>
                    <span
                      className={
                        s.tone === "pos"
                          ? "text-[var(--pos)] font-bold"
                          : s.tone === "neg"
                          ? "text-[var(--neg)] font-bold"
                          : "text-[var(--ink)] font-bold"
                      }
                    >
                      {s.value}
                    </span>
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={() =>
                askAssistant(`About this month: ${insight.title}. Break this down and suggest what I should do.`)
              }
              className="cursor-pointer group mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)] hover:gap-2.5 transition-all"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Ask Fintra about this
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
