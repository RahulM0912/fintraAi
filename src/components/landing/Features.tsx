import {
  Tags,
  CalendarDays,
  Target,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

/* Only the features the hero mockup doesn't already demonstrate —
   chat-to-log and instant summaries live in the mockup itself. */
const features: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Tags,
    title: "Category breakdown",
    desc: "Food, travel, utilities, entertainment — auto-categorised as you log.",
  },
  {
    icon: Target,
    title: "Budgets that answer back",
    desc: "Set a monthly cap, and every expense you log tells you how much of it is left.",
  },
  {
    icon: CalendarDays,
    title: "Monthly analytics",
    desc: "Quiet, readable reports of income against spending, month by month.",
  },
  {
    icon: ShieldCheck,
    title: "Asks before it acts",
    desc: "For large or destructive changes, Fintra checks with you first.",
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-[1100px] px-4 py-[70px] md:px-8" id="features">
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-px w-6 bg-[var(--brand)]" />
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
          Features
        </p>
      </div>
      <h2 className="font-display mt-4 mb-3 text-3xl font-semibold tracking-tight text-[var(--ink)] md:text-[2.1rem]">
        Everything you need,
        <br />
        nothing you don&apos;t
      </h2>
      <p className="mb-12 max-w-[500px] text-base text-[var(--ink-2)]">
        Fintra keeps it simple — just talk, and it keeps the ledger.
      </p>

      <div className="grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2">
        {features.map((feat) => (
          <div key={feat.title} className="border-t border-[var(--hairline)] pt-5">
            <feat.icon className="h-5 w-5 text-[var(--brand)]" aria-hidden />
            <h3 className="mt-3 mb-1.5 text-[0.95rem] font-semibold text-[var(--ink)]">
              {feat.title}
            </h3>
            <p className="text-[0.875rem] leading-[1.6] text-[var(--ink-2)]">
              {feat.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
