import React from "react";

const steps = [
  {
    num: "1",
    title: "Just type what you spent",
    desc: 'Write naturally — "dinner with friends ₹800" or "paid electricity bill ₹1,200"',
  },
  {
    num: "2",
    title: "Fintra understands it",
    desc: "The AI extracts amount, category, and date — no tagging, no dropdowns.",
  },
  {
    num: "3",
    title: "See where your money goes",
    desc: "Your dashboard updates instantly with charts, trends, and insights.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-[70px] px-4 md:px-8 max-w-[1100px] mx-auto">
      <p className="text-[0.8rem] font-semibold tracking-[.1em] uppercase text-[var(--ld-purple)] mb-2.5">
        How it works
      </p>
      <h2 className="font-sora text-3xl md:text-[2rem] font-bold text-[var(--ld-text)] mb-0">
        Three steps to financial clarity
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-6 items-center mt-10">
        {steps.map((step, i) => (
          <React.Fragment key={step.num}>
            <div className="text-center px-4 py-6">
              <div className="w-11 h-11 rounded-full bg-[var(--ld-purple-bg)] border border-[var(--ld-purple-border)] text-[var(--ld-purple)] font-sora font-bold text-[1.1rem] flex items-center justify-center mx-auto mb-4">
                {step.num}
              </div>
              <h3 className="font-sora text-base font-semibold text-[var(--ld-text)] mb-2">
                {step.title}
              </h3>
              <p className="text-[0.875rem] text-[var(--ld-text2)]">{step.desc}</p>
            </div>
            {i < steps.length - 1 && (
              <div className="hidden md:flex items-center justify-center text-[var(--ld-text3)] text-2xl">
                →
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
