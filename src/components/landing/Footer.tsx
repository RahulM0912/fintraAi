import Link from "next/link";

export function Footer() {
  return (
    <div className="border-t border-[var(--ld-border)] mx-4 md:mx-8">
      <footer className="max-w-[1100px] mx-auto py-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="font-sora font-bold text-[var(--ld-purple)] flex items-center gap-2 text-[1.1rem]">
            <span className="w-[26px] h-[26px] rounded-lg bg-[var(--ld-purple)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              ✦
            </span>
            Fintra
          </div>
          <p className="mt-1 text-[0.8rem] text-[var(--ld-text3)]">
            AI-powered personal finance tracker
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
              className="text-[0.85rem] text-[var(--ld-text2)] hover:text-[var(--ld-purple)] transition-colors duration-200"
            >
              {label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
