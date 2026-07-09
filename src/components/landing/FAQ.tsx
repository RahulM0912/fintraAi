"use client";

import { useState } from "react";

const faqs = [
  {
    q: "What counts as an AI message?",
    a: "Every message you send to Fintra counts as one — whether you're adding a transaction, asking for a summary, or editing something. One message = one, regardless of how much you write in it. Adding or editing transactions manually doesn't count.",
  },
  {
    q: "What happens when I run out of AI messages?",
    a: "The free plan includes 50 AI messages a month, and the count resets at the start of each month. Everything except the AI chat keeps working. Want unlimited chat right away? Add your own OpenRouter or Gemini key in Settings — your data is never touched.",
  },
  {
    q: "Can I use my own AI key?",
    a: "Yes. Add an OpenRouter or Gemini API key in Settings and your chat becomes unlimited on your own key. It's encrypted at rest, only used for your requests, and never returned to the browser.",
  },
  {
    q: "Is my financial data safe?",
    a: "Yes. Your data is stored securely and never shared or sold. Fintra only reads data you explicitly give it through the chat, and it doesn't connect to your bank account.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="mx-auto max-w-[1100px] px-4 py-[70px] md:px-8" id="faq">
      <div className="mx-auto max-w-[680px]">
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-px w-6 bg-[var(--brand)]" />
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
            FAQ
          </p>
        </div>
        <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-[var(--ink)] md:text-[2.1rem]">
          Questions, answered
        </h2>

        <div className="mt-10 divide-y divide-[var(--hairline)] border-t border-[var(--hairline)]">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                className="flex min-h-11 w-full cursor-pointer items-center justify-between py-4 text-left text-[0.95rem] font-medium text-[var(--ink)] transition-colors duration-150 hover:text-[var(--brand)]"
              >
                {faq.q}
                <span
                  aria-hidden
                  className={`ml-4 shrink-0 text-lg text-[var(--ink-3)] transition-transform duration-200 ease-out ${
                    open === i ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ease-out ${
                  open === i ? "max-h-[260px] pb-5" : "max-h-0"
                }`}
              >
                <p className="text-[0.875rem] leading-[1.7] text-[var(--ink-2)]">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
