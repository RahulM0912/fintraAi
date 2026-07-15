"use client";

import { useEffect, useState } from "react";

// Recharts renders to SVG and passes stroke/fill as presentation attributes,
// which do NOT resolve CSS var(). Read tokens off the document at runtime and
// re-read when the theme class flips.

export interface ChartTokens {
  pos: string;
  neg: string;
  ink2: string;
  ink3: string;
  hairline: string;
}

export const FALLBACK_TOKENS: ChartTokens = {
  pos: "#217a52",
  neg: "#a44a2a",
  ink2: "#5b564a",
  ink3: "#746c5d",
  hairline: "#e2ddce",
};

function readTokens(): ChartTokens {
  if (typeof window === "undefined") return FALLBACK_TOKENS;
  const cs = getComputedStyle(document.documentElement);
  const get = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
  return {
    pos: get("--chart-pos", FALLBACK_TOKENS.pos),
    neg: get("--chart-neg", FALLBACK_TOKENS.neg),
    ink2: get("--ink-2", FALLBACK_TOKENS.ink2),
    ink3: get("--ink-3", FALLBACK_TOKENS.ink3),
    hairline: get("--hairline", FALLBACK_TOKENS.hairline),
  };
}

/** Theme-reactive chart colors + a `mounted` flag for SSR-safe rendering. */
export function useChartTokens() {
  const [mounted, setMounted] = useState(false);
  const [tokens, setTokens] = useState<ChartTokens>(FALLBACK_TOKENS);

  useEffect(() => {
    setMounted(true);
    setTokens(readTokens());
    const obs = new MutationObserver(() => setTokens(readTokens()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return { tokens, mounted };
}

export function compactINR(n: number) {
  if (Math.abs(n) >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (Math.abs(n) >= 1_000) return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${n}`;
}
