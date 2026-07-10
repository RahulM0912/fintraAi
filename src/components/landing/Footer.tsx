import Link from "next/link";

export function Footer() {
  return (
    <div className="mx-4 border-t border-[var(--hairline)] md:mx-8">
      <footer className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4 py-8">
        <div>
          <p className="font-display text-[1.1rem] font-semibold tracking-tight text-[var(--ink)]">
            Fintra
          </p>
          <p className="mt-1 text-[0.8rem] text-[var(--ink-3)]">
            Money, plainly told.
          </p>
        </div>

        <div className="flex gap-5">
          {[
            { label: "Privacy Policy", href: "#" },
            { label: "Terms of Service", href: "#" },
            { label: "Contact", href: "#" },
          ].map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="text-[0.85rem] text-[var(--ink-2)] transition-colors duration-150 hover:text-[var(--ink)]"
            >
              {label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
