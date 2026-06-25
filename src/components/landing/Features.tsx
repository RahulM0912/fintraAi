const features = [
  {
    icon: "💬",
    title: "Chat to log",
    desc: 'Say "I spent ₹350 on auto today" and it\'s logged instantly. No tapping through forms.',
  },
  {
    icon: "📊",
    title: "Instant summaries",
    desc: 'Ask "where did I spend the most?" and get a clear breakdown in seconds.',
  },
  {
    icon: "🗂️",
    title: "Category breakdown",
    desc: "Food, travel, utilities, entertainment — auto-categorised as you log.",
  },
  {
    icon: "📅",
    title: "Monthly analytics",
    desc: "Visual reports of your income vs expenses, month by month.",
  },
  {
    icon: "✅",
    title: "Human-in-loop",
    desc: "For large or destructive actions, Fintra asks you to confirm first.",
  },
  {
    icon: "🌙",
    title: "Dark & light mode",
    desc: "Looks great at midnight or midday — your dashboard, your preference.",
  },
];

export function Features() {
  return (
    <section className="py-[70px] px-4 md:px-8 max-w-[1100px] mx-auto" id="features">
      <p className="text-[0.8rem] font-semibold tracking-[.1em] uppercase text-[var(--ld-purple)] mb-2.5">
        Features
      </p>
      <h2 className="font-sora text-3xl md:text-[2rem] font-bold text-[var(--ld-text)] mb-3">
        Everything you need,<br />nothing you don&apos;t
      </h2>
      <p className="text-[var(--ld-text2)] text-base mb-10 max-w-[500px]">
        Fintra keeps it simple — just chat and it handles the rest.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feat) => (
          <div
            key={feat.title}
            className="bg-[var(--ld-surface)] border border-[var(--ld-border)] rounded-[14px] p-6 hover:border-[var(--ld-purple-border)] hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="w-[42px] h-[42px] rounded-[10px] bg-[var(--ld-purple-bg)] border border-[var(--ld-purple-border)] flex items-center justify-center text-lg mb-4">
              {feat.icon}
            </div>
            <h3 className="font-sora text-[0.95rem] font-semibold text-[var(--ld-text)] mb-1.5">
              {feat.title}
            </h3>
            <p className="text-[0.85rem] text-[var(--ld-text2)] leading-[1.55]">
              {feat.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
