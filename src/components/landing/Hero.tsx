import Link from "next/link";

function ChatMockup() {
  return (
    <div
      className="rounded-2xl overflow-hidden border border-[var(--ld-border)] bg-[var(--ld-surface)]"
      style={{ boxShadow: "0 0 60px var(--ld-accent-glow)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[var(--ld-border)] bg-[var(--ld-surface2)]">
        <div className="w-9 h-9 rounded-[10px] bg-[var(--ld-purple)] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          ✦
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[var(--ld-text)] font-sora">Fintra AI</h4>
          <p className="text-xs text-[var(--ld-text2)]">Powered by Gemini</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3 min-h-[280px]">
        {/* User message */}
        <div className="flex flex-row-reverse items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg flex-shrink-0 bg-[var(--ld-bg4)] flex items-center justify-center text-xs font-bold text-[var(--ld-text2)]">
            U
          </div>
          <div className="text-sm bg-[var(--ld-purple-bg)] border border-[var(--ld-purple-border)] rounded-xl px-3.5 py-2.5 text-[var(--ld-text)] max-w-[78%] leading-relaxed">
            Show this month&apos;s spending
          </div>
        </div>

        {/* AI summary message */}
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg flex-shrink-0 bg-[var(--ld-purple)] flex items-center justify-center text-xs font-bold text-white">
            ✦
          </div>
          <div className="flex flex-col gap-2 max-w-[88%]">
            <div className="text-sm bg-[var(--ld-surface2)] border border-[var(--ld-border)] rounded-xl px-3.5 py-2.5 text-[var(--ld-text)] leading-relaxed">
              <strong className="text-[var(--ld-text)] text-[0.9rem]">May 2026 Spending Summary</strong>
              {/* Summary table */}
              <div className="mt-2.5 rounded-[10px] overflow-hidden border border-[var(--ld-border)] bg-[var(--ld-bg3)]">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="px-3 py-1.5 text-left text-[var(--ld-text2)] font-medium bg-[var(--ld-surface2)]">Metric</th>
                      <th className="px-3 py-1.5 text-left text-[var(--ld-text2)] font-medium bg-[var(--ld-surface2)]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-3 py-1.5 border-t border-[var(--ld-border)] text-[var(--ld-text)]">Total Income</td>
                      <td className="px-3 py-1.5 border-t border-[var(--ld-border)] text-[var(--ld-text)]">₹0</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 border-t border-[var(--ld-border)] text-[var(--ld-text)]">Total Expense</td>
                      <td className="px-3 py-1.5 border-t border-[var(--ld-border)] font-semibold text-[var(--ld-red)]">₹777.45</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 border-t border-[var(--ld-border)] text-[var(--ld-text)]">Net Balance</td>
                      <td className="px-3 py-1.5 border-t border-[var(--ld-border)] font-semibold text-[var(--ld-red)]">-₹777.45</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p
                className="mt-2 text-[0.78rem] rounded-[7px] px-2.5 py-1.5"
                style={{ color: "var(--ld-red)", backgroundColor: "var(--ld-red-bg)" }}
              >
                ⚠ All outflow, no income recorded this month.
              </p>
            </div>
          </div>
        </div>

        {/* User message 2 */}
        <div className="flex flex-row-reverse items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg flex-shrink-0 bg-[var(--ld-bg4)] flex items-center justify-center text-xs font-bold text-[var(--ld-text2)]">
            U
          </div>
          <div className="text-sm bg-[var(--ld-purple-bg)] border border-[var(--ld-purple-border)] rounded-xl px-3.5 py-2.5 text-[var(--ld-text)] max-w-[78%] leading-relaxed">
            Add ₹500 for food today
          </div>
        </div>

        {/* AI message 2 */}
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg flex-shrink-0 bg-[var(--ld-purple)] flex items-center justify-center text-xs font-bold text-white">
            ✦
          </div>
          <div className="text-sm bg-[var(--ld-surface2)] border border-[var(--ld-border)] rounded-xl px-3.5 py-2.5 text-[var(--ld-text)] max-w-[78%] leading-relaxed">
            Done! Added <strong>₹500</strong> under Food &amp; Dining for today. You&apos;ve spent <strong>₹1,277</strong> on food this month.
          </div>
        </div>
      </div>

      {/* Suggestion pills */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-3.5">
        {[
          "➕ Add ₹500 food expense today",
          "📊 Show this month's spending",
          "↗ Where did I spend the most?",
        ].map((pill) => (
          <button
            key={pill}
            className="bg-[var(--ld-surface2)] border border-[var(--ld-border)] rounded-full px-3 py-1.5 text-[0.78rem] text-[var(--ld-text2)] hover:border-[var(--ld-purple)] hover:text-[var(--ld-purple)] transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="px-4 py-2.5 border-t border-[var(--ld-border)] bg-[var(--ld-surface2)] flex items-center gap-2">
        <input
          className="flex-1 bg-[var(--ld-bg3)] border border-[var(--ld-border)] rounded-lg px-3 py-2 text-[0.83rem] text-[var(--ld-text)] outline-none"
          placeholder="Add ₹500 for food today..."
          readOnly
        />
        <button className="w-[34px] h-[34px] rounded-lg bg-[var(--ld-purple)] border-none text-white text-sm flex items-center justify-center flex-shrink-0 cursor-pointer">
          →
        </button>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="px-4 md:px-8 py-16 md:py-20 max-w-[1100px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">

        {/* Left copy */}
        <div>
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-[var(--ld-purple-bg)] border border-[var(--ld-purple-border)] text-[var(--ld-purple2)] text-[0.8rem] font-medium px-3 py-1 rounded-full mb-5">
            <span
              className="w-1.5 h-1.5 rounded-full bg-[var(--ld-green)]"
              style={{ animation: "badge-pulse 2s infinite" }}
            />
            Now in early access · Built for India
          </div>

          <h1 className="font-sora text-[2.4rem] md:text-[2.8rem] font-bold leading-[1.15] mb-5 text-[var(--ld-text)]">
            Your finances,<br />
            managed by<br />
            <span className="text-[var(--ld-purple)]">just talking</span>
          </h1>

          <p className="text-[var(--ld-text2)] text-[1.05rem] mb-8 max-w-[440px] leading-[1.7]">
            Tell Fintra what you spent. It understands, logs it, and shows you
            exactly where your money goes — no spreadsheets, no forms.
          </p>

          <div className="flex gap-3 flex-wrap">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-6 py-3 rounded-lg text-base font-semibold text-white bg-[var(--ld-purple)] hover:bg-[var(--ld-purple2)] hover:-translate-y-px transition-all duration-200"
            >
              Start for free →
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center px-6 py-3 rounded-lg text-base font-medium border border-[var(--ld-border2)] text-[var(--ld-text)] hover:border-[var(--ld-purple)] hover:text-[var(--ld-purple)] transition-all duration-200"
            >
              See how it works
            </Link>
          </div>

          <p className="mt-4 text-[0.8rem] text-[var(--ld-text3)]">
            No credit card needed · Free plan available
          </p>
        </div>

        {/* Right: chat mockup */}
        <ChatMockup />
      </div>
    </section>
  );
}
