"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/navbar/ThemeToggle";
import { useAuth } from "@/components/auth/AuthProvider";

export function LandingNavbar() {
  const { user } = useAuth();

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--hairline)] bg-[var(--app-bg)]/90 backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-4 md:px-8">
        {/* Wordmark */}
        <Link
          href="/"
          className="font-display text-[22px] font-semibold tracking-tight text-[var(--ink)]"
        >
          Fintra
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-6 md:flex">
          {[
            { href: "#features", label: "Features" },
            { href: "#pricing", label: "Pricing" },
            { href: "#faq", label: "FAQ" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-[var(--ink-2)] transition-colors duration-150 hover:text-[var(--ink)]"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 text-sm font-medium text-[var(--primary-foreground)] transition-colors duration-150 ease-out hover:bg-[var(--brand-hover)]"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="hidden min-h-11 items-center rounded-lg border border-[var(--hairline-strong)] px-4 text-sm font-medium text-[var(--ink)] transition-colors duration-150 ease-out hover:border-[var(--ink-3)] sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 text-sm font-medium text-[var(--primary-foreground)] transition-colors duration-150 ease-out hover:bg-[var(--brand-hover)]"
              >
                Get started free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
