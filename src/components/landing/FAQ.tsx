"use client";

import { useState } from "react";

const faqs = [
  {
    q: "What counts as an AI message?",
    a: "Every message you send to Fintra AI counts as one — whether you're adding a transaction, asking for a summary, or editing something. One message = one, regardless of how much you write in it. Adding or editing transactions manually doesn't count.",
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
    <section className="py-[70px] px-4 md:px-8 max-w-[1100px] mx-auto text-center" id="faq">
      <p className="text-[0.8rem] font-semibold tracking-[.1em] uppercase text-[var(--ld-purple)] mb-2.5 inline-block">
        FAQ
      </p>
      <h2 className="font-sora text-3xl md:text-[2rem] font-bold text-[var(--ld-text)] mb-0">
        Questions answered
      </h2>

      <div className="flex flex-col gap-3 max-w-[680px] mx-auto mt-10 text-left">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="bg-[var(--ld-surface)] border border-[var(--ld-border)] rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full px-5 py-4 flex justify-between items-center text-[0.95rem] font-medium text-[var(--ld-text)] text-left hover:text-[var(--ld-purple)] transition-colors duration-200 cursor-pointer"
            >
              {faq.q}
              <span
                className={`text-[var(--ld-text3)] text-lg flex-shrink-0 ml-4 transition-transform duration-300 ${
                  open === i ? "rotate-45" : ""
                }`}
              >
                +
              </span>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                open === i ? "max-h-[260px] pb-4" : "max-h-0"
              }`}
            >
              <p className="px-5 text-[0.875rem] text-[var(--ld-text2)] leading-[1.7]">
                {faq.a}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
