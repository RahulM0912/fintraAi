import Link from "next/link";

const features = [
  "Natural-language AI assistant",
  "Unlimited transactions & categories",
  "Monthly & yearly analytics",
  "Budgets & recurring transactions",
  "CSV import & export",
  "Light & dark mode",
];

function Check() {
  return (
    <span className="flex-shrink-0 text-[var(--ld-green)] text-sm">✓</span>
  );
}

export function Pricing() {
  return (
    <section className="py-[70px] px-4 md:px-8 max-w-[1100px] mx-auto text-center" id="pricing">
      <p className="text-[0.8rem] font-semibold tracking-[.1em] uppercase text-[var(--ld-purple)] mb-2.5 inline-block">
        Pricing
      </p>
      <h2 className="font-sora text-3xl md:text-[2rem] font-bold text-[var(--ld-text)] mb-3">
        Free while we&apos;re in early access
      </h2>
      <p className="text-[var(--ld-text2)] text-base mb-10 max-w-[520px] mx-auto">
        Everything Fintra does is free right now. Use the built-in AI on us, or
        connect your own API key for unlimited chat.
      </p>

      <div className="max-w-[420px] mx-auto">
        <div className="relative bg-[var(--ld-surface)] border-2 border-[var(--ld-purple)] rounded-2xl p-8 text-left">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--ld-purple)] text-white text-[0.75rem] font-semibold font-sora px-3.5 py-0.5 rounded-full whitespace-nowrap">
            Early access
          </div>

          <p className="font-sora text-base font-semibold text-[var(--ld-text2)] mb-2">Free</p>
          <div className="font-sora text-[2.6rem] font-bold text-[var(--ld-text)] mb-1 flex items-baseline gap-1">
            ₹0 <span className="text-base font-normal text-[var(--ld-text2)]">/month</span>
          </div>
          <div className="text-[0.82rem] text-[var(--ld-text2)] mb-6 px-2.5 py-1.5 bg-[var(--ld-bg3)] rounded-md inline-block">
            50 AI messages / month included
          </div>

          <ul className="flex flex-col gap-2.5 mb-6">
            {features.map((f) => (
              <li key={f} className="text-[0.9rem] text-[var(--ld-text2)] flex items-center gap-2">
                <Check /> {f}
              </li>
            ))}
          </ul>

          <Link
            href="/sign-up"
            className="block w-full py-3 rounded-[10px] text-[0.95rem] font-semibold font-sora text-center bg-[var(--ld-purple)] text-white hover:bg-[var(--ld-purple2)] hover:-translate-y-px transition-all duration-200"
          >
            Get started free →
          </Link>
        </div>

        {/* BYO-key note */}
        <p className="mt-4 text-[0.83rem] text-[var(--ld-text3)] leading-relaxed">
          Need more than 50 messages?{" "}
          <span className="text-[var(--ld-text2)] font-medium">
            Add your own OpenRouter or Gemini key
          </span>{" "}
          in Settings for unlimited AI — your key stays encrypted and never leaves
          your account.
        </p>
      </div>
    </section>
  );
}
