const freeFeatures = [
  "Add & track transactions",
  "Category breakdowns",
  "Basic spending summary",
  "Light & dark mode",
  "Top-up available at ₹40",
];

const proFeatures = [
  "Everything in Free",
  "Monthly & yearly analytics",
  "Bulk transaction import",
  "Export to CSV",
  "Priority AI responses",
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
        Simple, honest pricing
      </h2>
      <p className="text-[var(--ld-text2)] text-base mb-10 max-w-[500px] mx-auto">
        Start free. Upgrade when you need more. No hidden fees.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[680px] mx-auto">
        {/* Free plan */}
        <div className="bg-[var(--ld-surface)] border border-[var(--ld-border)] rounded-2xl p-7 text-left">
          <p className="font-sora text-base font-semibold text-[var(--ld-text2)] mb-2">Free</p>
          <div className="font-sora text-[2.4rem] font-bold text-[var(--ld-text)] mb-1 flex items-baseline gap-1">
            ₹0 <span className="text-base font-normal text-[var(--ld-text2)]">/month</span>
          </div>
          <div className="text-[0.82rem] text-[var(--ld-text2)] mb-6 px-2.5 py-1.5 bg-[var(--ld-bg3)] rounded-md inline-block">
            ~300 queries / month
          </div>
          <ul className="flex flex-col gap-2.5 mb-7">
            {freeFeatures.map((f) => (
              <li key={f} className="text-[0.875rem] text-[var(--ld-text2)] flex items-center gap-2">
                <Check /> {f}
              </li>
            ))}
          </ul>
          <button className="w-full py-3 rounded-[10px] text-[0.95rem] font-semibold font-sora border border-[var(--ld-border2)] text-[var(--ld-text)] bg-transparent hover:border-[var(--ld-purple)] hover:text-[var(--ld-purple)] transition-all duration-200 cursor-pointer">
            Get started free
          </button>
        </div>

        {/* Pro plan */}
        <div className="relative bg-[var(--ld-surface)] border-2 border-[var(--ld-purple)] rounded-2xl p-7 text-left">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--ld-purple)] text-white text-[0.75rem] font-semibold font-sora px-3.5 py-0.5 rounded-full whitespace-nowrap">
            ⭐ Recommended
          </div>
          <p className="font-sora text-base font-semibold text-[var(--ld-text2)] mb-2">Pro</p>
          <div className="font-sora text-[2.4rem] font-bold text-[var(--ld-text)] mb-1 flex items-baseline gap-1">
            ₹99 <span className="text-base font-normal text-[var(--ld-text2)]">/month</span>
          </div>
          <div className="text-[0.82rem] text-[var(--ld-text2)] mb-6 px-2.5 py-1.5 bg-[var(--ld-bg3)] rounded-md inline-block">
            ~1,500 queries / month
          </div>
          <ul className="flex flex-col gap-2.5 mb-7">
            {proFeatures.map((f) => (
              <li key={f} className="text-[0.875rem] text-[var(--ld-text2)] flex items-center gap-2">
                <Check /> {f}
              </li>
            ))}
          </ul>
          <button className="w-full py-3 rounded-[10px] text-[0.95rem] font-semibold font-sora bg-[var(--ld-purple)] text-white border-none hover:bg-[var(--ld-purple2)] hover:-translate-y-px transition-all duration-200 cursor-pointer">
            Upgrade to Pro →
          </button>
        </div>
      </div>

      {/* Top-up note */}
      <div className="mt-5 text-[0.83rem] text-[var(--ld-text3)] bg-[var(--ld-surface)] border border-[var(--ld-border)] rounded-[10px] px-5 py-3 max-w-[480px] mx-auto">
        Need a little more?{" "}
        <strong className="text-[var(--ld-text2)]">
          Top up anytime — ₹40 for ~160 extra queries.
        </strong>{" "}
        No subscription, no commitment.
      </div>
    </section>
  );
}
