import Link from "next/link";

/* Closing invitation. One headline, one button, and the two facts a
   hesitant visitor needs (it's free, no card) — the whole pricing story
   in a footnote instead of a section. */
export function CTA() {
  return (
    <section className="mx-auto max-w-[1100px] px-4 py-20 text-center md:px-8 md:py-28">
      <div className="mb-6 flex items-center justify-center gap-3">
        <span aria-hidden className="h-px w-6 bg-[var(--brand)]" />
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
          Early access
        </p>
        <span aria-hidden className="h-px w-6 bg-[var(--brand)]" />
      </div>

      <h2 className="font-display mx-auto max-w-[560px] text-3xl font-semibold leading-[1.15] tracking-tight text-[var(--ink)] md:text-[2.6rem]">
        Log today&apos;s chai.
        <br />
        See where the month goes.
      </h2>

      <p className="mx-auto mt-5 max-w-[420px] text-base leading-[1.7] text-[var(--ink-2)]">
        The record starts with one message. Tomorrow it takes ten seconds —
        and the month explains itself.
      </p>

      <div className="mt-9">
        <Link
          href="/sign-up"
          className="inline-flex min-h-12 items-center gap-1.5 rounded-lg bg-[var(--brand)] px-8 text-base font-medium text-[var(--primary-foreground)] transition-colors duration-150 ease-out hover:bg-[var(--brand-hover)]"
        >
          Start for free
        </Link>
      </div>

      <p className="mt-5 text-[0.8rem] text-[var(--ink-3)]">
        Free while we&apos;re in early access · No credit card needed
      </p>
    </section>
  );
}
