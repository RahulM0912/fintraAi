import React from "react";

const steps = [
  {
    num: "1",
    title: "Type what you spent",
    desc: 'Write naturally — "dinner with friends ₹800" or "paid electricity bill ₹1,200".',
  },
  {
    num: "2",
    title: "Fintra understands it",
    desc: "It extracts the amount, category, and date — no tagging, no dropdowns.",
  },
  {
    num: "3",
    title: "See where the money goes",
    desc: "The ledger updates instantly, and the agent tells you what changed — and what's left of the budget.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-[1100px] px-4 py-[70px] md:px-8" id="how">
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-px w-6 bg-[var(--brand)]" />
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
          How it works
        </p>
      </div>
      <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-[var(--ink)] md:text-[2.1rem]">
        Ten seconds a day.
        <br />
        That&apos;s the whole system.
      </h2>

      <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3">
        {steps.map((step) => (
          <div key={step.num} className="border-t border-[var(--hairline)] pt-5">
            <span className="font-display tnum text-3xl font-semibold text-[var(--brand)]">
              {step.num}
            </span>
            <h3 className="mt-3 mb-2 text-base font-semibold text-[var(--ink)]">
              {step.title}
            </h3>
            <p className="text-[0.875rem] leading-[1.6] text-[var(--ink-2)]">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
