import Link from "next/link";

/* The hero mockup mirrors the real chat surface: correspondence on paper —
   the agent speaks in flat prose under a byline, the user in a quiet tinted
   block. No glow, no avatars, no emoji. */
function ChatMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--hairline)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--hairline)] px-4 py-3.5">
        <span aria-hidden className="h-px w-5 bg-[var(--brand)]" />
        <div>
          <h4 className="font-display text-sm font-semibold text-[var(--ink)]">Fintra</h4>
          <p className="text-xs text-[var(--ink-3)]">Ask about your money</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-[280px] flex-col gap-4 p-4">
        {/* User message */}
        <div className="flex justify-end">
          <div className="max-w-[78%] rounded-xl rounded-br-sm bg-[var(--surface-2)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--ink)]">
            Show this month&apos;s spending
          </div>
        </div>

        {/* Agent reply with a ledger table */}
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span aria-hidden className="h-px w-4 bg-[var(--brand)]" />
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
              Fintra
            </span>
          </div>
          <div className="max-w-[88%] text-sm leading-relaxed text-[var(--ink)]">
            <strong className="font-medium">May, so far.</strong>
            <div className="tnum mt-2.5 overflow-hidden rounded-lg border border-[var(--hairline)]">
              <table className="w-full border-collapse text-xs">
                <tbody>
                  <tr>
                    <td className="px-3 py-1.5 text-[var(--ink-2)]">Money in</td>
                    <td className="px-3 py-1.5 text-right text-[var(--ink)]">₹0</td>
                  </tr>
                  <tr>
                    <td className="border-t border-[var(--hairline)] px-3 py-1.5 text-[var(--ink-2)]">Money out</td>
                    <td className="border-t border-[var(--hairline)] px-3 py-1.5 text-right font-medium text-[var(--ink)]">₹777</td>
                  </tr>
                  <tr>
                    <td className="border-t border-[var(--hairline)] px-3 py-1.5 text-[var(--ink-2)]">Balance</td>
                    <td className="border-t border-[var(--hairline)] px-3 py-1.5 text-right font-medium text-[var(--neg)]">−₹777</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 rounded-md bg-[var(--neg-bg)] px-2.5 py-1.5 text-[0.78rem] text-[var(--neg)]">
              All outflow — no income recorded yet this month.
            </p>
          </div>
        </div>

        {/* User message 2 */}
        <div className="flex justify-end">
          <div className="max-w-[78%] rounded-xl rounded-br-sm bg-[var(--surface-2)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--ink)]">
            Add ₹500 for food today
          </div>
        </div>

        {/* Agent reply 2 */}
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span aria-hidden className="h-px w-4 bg-[var(--brand)]" />
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
              Fintra
            </span>
          </div>
          <p className="max-w-[88%] text-sm leading-relaxed text-[var(--ink)]">
            Logged — <strong className="tnum font-medium">₹500</strong> under Food &amp;
            drinks, today. That&apos;s{" "}
            <strong className="tnum font-medium">₹1,277</strong> on food this month.
          </p>
        </div>
      </div>

      {/* Suggestion pills */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-3.5">
        {[
          "Add ₹500 food expense today",
          "Show this month's spending",
          "Where did I spend the most?",
        ].map((pill) => (
          <span
            key={pill}
            className="rounded-full border border-[var(--hairline)] px-3 py-1.5 text-[0.78rem] text-[var(--ink-2)]"
          >
            {pill}
          </span>
        ))}
      </div>

      {/* Input row */}
      <div className="flex items-center gap-2 border-t border-[var(--hairline)] px-4 py-2.5">
        <div className="flex-1 rounded-lg border border-[var(--hairline-strong)] px-3 py-2 text-[0.83rem] text-[var(--ink-3)]">
          Add ₹500 for food today…
        </div>
        <span
          aria-hidden
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-sm text-[var(--primary-foreground)]"
        >
          →
        </span>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="mx-auto max-w-[1100px] px-4 py-16 md:px-8 md:py-24">
      <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-16">
        {/* Left copy */}
        <div>
          <div className="mb-6 flex items-center gap-3">
            <span aria-hidden className="h-px w-6 bg-[var(--brand)]" />
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
              Early access · Built for India
            </p>
          </div>

          <h1 className="font-display mb-6 text-[2.6rem] font-semibold leading-[1.12] tracking-tight text-[var(--ink)] md:text-[3.2rem]">
            Money, managed
            <br />
            by <em className="text-[var(--brand)]">just talking</em>
          </h1>

          <p className="mb-9 max-w-[440px] text-[1.05rem] leading-[1.7] text-[var(--ink-2)]">
            Tell Fintra what you spent. It logs it, reads the pattern, and
            tells you what to watch — no spreadsheets, no forms.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="inline-flex min-h-12 items-center gap-1.5 rounded-lg bg-[var(--brand)] px-6 text-base font-medium text-[var(--primary-foreground)] transition-colors duration-150 ease-out hover:bg-[var(--brand-hover)]"
            >
              Start for free
            </Link>
            <Link
              href="#how"
              className="inline-flex min-h-12 items-center rounded-lg border border-[var(--hairline-strong)] px-6 text-base font-medium text-[var(--ink)] transition-colors duration-150 ease-out hover:border-[var(--ink-3)]"
            >
              See how it works
            </Link>
          </div>

          <p className="mt-5 text-[0.8rem] text-[var(--ink-3)]">
            Free while we&apos;re in early access · No credit card needed
          </p>
        </div>

        {/* Right: chat mockup */}
        <ChatMockup />
      </div>
    </section>
  );
}
