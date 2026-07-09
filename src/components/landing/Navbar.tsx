"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/navbar/ThemeToggle";
import { useAuth } from "@/components/auth/AuthProvider";

export function LandingNavbar() {
  const { user } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-[var(--ld-bg)] border-b border-[var(--ld-border)] transition-colors duration-300">
      <div className="flex items-center justify-between h-[60px] max-w-[1100px] mx-auto px-4 md:px-8">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-sora font-bold text-[1.3rem] text-[var(--ld-purple)]"
        >
          <span className="w-8 h-8 rounded-lg bg-[var(--ld-purple)] flex items-center justify-center text-white text-base font-bold flex-shrink-0">
            ✦
          </span>
          Fintra
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6">
          {[
            { href: "#features", label: "Features" },
            { href: "#pricing", label: "Pricing" },
            { href: "#faq", label: "FAQ" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-[var(--ld-text2)] hover:text-[var(--ld-text)] transition-colors duration-200"
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
              className="inline-flex items-center gap-1.5 px-[18px] py-[7px] rounded-lg text-sm font-semibold text-white bg-[var(--ld-purple)] hover:bg-[var(--ld-purple2)] hover:-translate-y-px transition-all duration-200"
            >
              Go to dashboard →
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="hidden sm:inline-flex items-center px-4 py-[7px] rounded-lg text-sm font-medium border border-[var(--ld-border2)] text-[var(--ld-text)] hover:border-[var(--ld-purple)] hover:text-[var(--ld-purple)] transition-all duration-200"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-1.5 px-[18px] py-[7px] rounded-lg text-sm font-semibold text-white bg-[var(--ld-purple)] hover:bg-[var(--ld-purple2)] hover:-translate-y-px transition-all duration-200"
              >
                Get started free →
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
