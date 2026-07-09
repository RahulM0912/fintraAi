import Link from "next/link";
import { Check } from "lucide-react";

const features = [
  "Natural-language AI assistant",
  "Unlimited transactions & categories",
  "Monthly & yearly analytics",
  "Budgets & recurring transactions",
  "CSV import & export",
  "Light & dark mode",
];

export function Pricing() {
  return (
    <section className="mx-auto max-w-[1100px] px-4 py-[70px] text-center md:px-8" id="pricing">
      <div className="inline-flex items-center gap-3">
        <span aria-hidden className="h-px w-6 bg-[var(--brand)]" />
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
          Pricing
        </p>
      </div>
      <h2 className="font-display mt-4 mb-3 text-3xl font-semibold tracking-tight text-[var(--ink)] md:text-[2.1rem]">
        Free while we&apos;re in early access
      </h2>
      <p className="mx-auto mb-12 max-w-[520px] text-base text-[var(--ink-2)]">
        Everything Fintra does is free right now. Use the built-in AI on us, or
        connect your own API key for unlimited chat.
      </p>

      <div className="mx-auto max-w-[420px]">
        <div className="rounded-xl border border-[var(--hairline-strong)] bg-[var(--surface)] p-8 text-left">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--brand)]">
            Early access
          </p>
          <div className="font-display tnum mt-4 mb-1 flex items-baseline gap-1 text-[2.8rem] font-semibold text-[var(--ink)]">
            ₹0 <span className="font-sans text-base font-normal text-[var(--ink-2)]">/month</span>
          </div>
          <p className="mb-6 text-[0.83rem] text-[var(--ink-2)]">
            50 AI messages a month included
          </p>

          <ul className="mb-7 flex flex-col gap-2.5 border-t border-[var(--hairline)] pt-5">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[0.9rem] text-[var(--ink-2)]">
                <Check className="h-4 w-4 shrink-0 text-[var(--pos)]" aria-hidden /> {f}
              </li>
            ))}
          </ul>

          <Link
            href="/sign-up"
            className="flex min-h-12 w-full items-center justify-center rounded-lg bg-[var(--brand)] text-[0.95rem] font-medium text-[var(--primary-foreground)] transition-colors duration-150 ease-out hover:bg-[var(--brand-hover)]"
          >
            Get started free
          </Link>
        </div>

        {/* BYO-key note */}
        <p className="mt-5 text-[0.83rem] leading-relaxed text-[var(--ink-3)]">
          Need more than 50 messages?{" "}
          <span className="font-medium text-[var(--ink-2)]">
            Add your own OpenRouter or Gemini key
          </span>{" "}
          in Settings for unlimited AI — your key stays encrypted and never
          leaves your account.
        </p>
      </div>
    </section>
  );
}
