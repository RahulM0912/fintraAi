"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStore } from "@/store/dashboardStore";
import { useQuickAdd } from "@/components/common/QuickAddProvider";

function inr(n: number) {
  return `₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;
}

function askAssistant(prompt: string) {
  window.dispatchEvent(new CustomEvent("open-assistant", { detail: { prompt } }));
}

/* Numbers inside the briefing prose get typographic emphasis: heavier
   weight and lining figures, so the sentence reads and the figures land. */
const FIGURE_RE = /(₹[\d,]+(?:\.\d+)?|[+−-]?\d+(?:\.\d+)?%)/g;

function Emphasized({ text }: { text: string }) {
  // split() with a capturing group alternates [text, figure, text, …]
  const parts = text.split(FIGURE_RE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold tnum text-[var(--ink)]">
            {part}
          </strong>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

/* One-click actions the agent proposes alongside its observation. */
function ActionButton({
  children,
  onClick,
  href,
  primary,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  primary?: boolean;
}) {
  const cls = primary
    ? "inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--brand)] px-5 text-sm font-medium text-[var(--primary-foreground)] transition-colors duration-150 ease-out hover:bg-[var(--brand-hover)]"
    : "inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--hairline-strong)] px-5 text-sm font-medium text-[var(--ink)] transition-colors duration-150 ease-out hover:border-[var(--ink-3)] hover:bg-[var(--surface)]";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={`cursor-pointer ${cls}`}>
      {children}
    </button>
  );
}

export function AgentBriefing() {
  // Data arrives via the page-level /api/dashboard fetch; this component
  // only reads the store.
  const { totalIncome, totalExpense, netBalance, insights, hydrated } = useDashboardStore();
  const { openAdd } = useQuickAdd();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const now = new Date();
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(now);
  const dateLine = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const isLoading = !mounted || !hydrated;
  const hasActivity = (totalIncome ?? 0) > 0 || (totalExpense ?? 0) > 0;
  const net = netBalance ?? 0;
  const insight = insights?.primary ?? null;
  const isBudgetSignal = insight ? /budget/i.test(insight.title) : false;

  return (
    <section aria-labelledby="briefing-heading">
      {/* Eyebrow: a short evergreen rule + the section's name and date */}
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-px w-6 bg-[var(--brand)]" />
        <h2
          id="briefing-heading"
          className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]"
        >
          The briefing · {dateLine}
        </h2>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-4 max-w-3xl">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-5/6" />
          <Skeleton className="h-8 w-2/3" />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-11 w-44 rounded-lg" />
            <Skeleton className="h-11 w-40 rounded-lg" />
          </div>
        </div>
      ) : !hasActivity ? (
        <>
          <p className="font-display mt-6 max-w-3xl text-[26px] leading-[1.35] text-[var(--ink)] sm:text-[32px]">
            Nothing logged yet this {monthName}. Add a transaction or two and
            I&apos;ll start telling you where your money goes — what&apos;s
            trending, what&apos;s at risk, and where you could cut.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <ActionButton primary onClick={() => openAdd("expense")}>
              <Plus className="h-4 w-4" aria-hidden />
              Add a transaction
            </ActionButton>
            <ActionButton
              onClick={() => askAssistant("What can you help me with?")}
            >
              Ask Fintra
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ActionButton>
          </div>
        </>
      ) : (
        <>
          <p className="font-display mt-6 max-w-3xl text-[26px] leading-[1.35] text-[var(--ink)] sm:text-[32px]">
            {net >= 0 ? (
              <>
                You&apos;re{" "}
                <strong className="font-semibold tnum text-[var(--pos)]">{inr(net)}</strong>{" "}
                ahead this {monthName} —{" "}
                <strong className="font-semibold tnum">{inr(totalIncome)}</strong> in,{" "}
                <strong className="font-semibold tnum">{inr(totalExpense)}</strong> out.
              </>
            ) : (
              <>
                You&apos;re{" "}
                <strong className="font-semibold tnum text-[var(--neg)]">{inr(net)}</strong>{" "}
                in the red this {monthName} —{" "}
                <strong className="font-semibold tnum">{inr(totalExpense)}</strong> out
                against <strong className="font-semibold tnum">{inr(totalIncome)}</strong> in.
              </>
            )}{" "}
            {insight && <Emphasized text={insight.detail} />}
          </p>

          {/* The agent proposes; one tap acts. */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <ActionButton
              primary
              onClick={() =>
                askAssistant(
                  insight
                    ? `About this month: ${insight.title}. Break this down and suggest what I should do.`
                    : "Summarize my month and suggest one improvement."
                )
              }
            >
              Ask Fintra about this
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ActionButton>
            {isBudgetSignal ? (
              <ActionButton href="#budgets">Review budgets</ActionButton>
            ) : (
              <ActionButton href="/transactions">See the transactions</ActionButton>
            )}
          </div>
          {/* No stat caption here: "Top category" already lives in "Where it
              went" and the totals live in the numbers strip. Briefing =
              interpretation; sections = evidence; no third layer. */}
        </>
      )}
    </section>
  );
}
