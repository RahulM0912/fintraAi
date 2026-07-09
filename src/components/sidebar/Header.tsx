"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/navbar/ThemeToggle";
import { useAuth } from "@/components/auth/AuthProvider";
import { getUserDisplay } from "@/utils/userDisplay";
import { useQuickAdd } from "@/components/common/QuickAddProvider";

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { openPalette } = useQuickAdd();

  let title = "Dashboard";
  if (pathname.includes("transactions")) title = "Transactions";
  else if (pathname.includes("settings")) title = "Settings";
  else if (pathname.includes("chat")) title = "Chat";

  const { firstName } = getUserDisplay(user);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-[var(--hairline)] bg-[var(--app-bg)]/85 px-4 backdrop-blur-md lg:h-[72px] lg:border-b-0 lg:px-8">
      <div className="flex items-center gap-3">
        {/* Brand mark — mobile only (sidebar wordmark is desktop-only) */}
        <Link
          href="/dashboard"
          className="font-display lg:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--hairline-strong)] text-base font-semibold text-[var(--ink)]"
          aria-label="Fintra home"
        >
          F
        </Link>

        {/* Mobile: page title (pages hide their own h1 below lg). Desktop: greeting —
            each page renders its own h1, so no duplicate titles. */}
        <h1 className="font-display lg:hidden text-lg font-semibold text-[var(--ink)]">
          {title}
        </h1>
        <p className="hidden text-sm text-[var(--ink-2)] lg:block">
          {greeting}
          {firstName ? `, ${firstName}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick-add / command palette — desktop affordance (mobile uses bottom-nav +) */}
        <button
          onClick={openPalette}
          className="hidden min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[var(--hairline-strong)] px-3 text-sm text-[var(--ink-2)] transition-colors duration-150 ease-out hover:border-[var(--ink-3)] hover:text-[var(--ink)] sm:flex"
          aria-label="Open quick add and search"
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="hidden md:inline">Quick add</span>
          <kbd className="rounded border border-[var(--hairline)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink-3)]">
            ⌘K
          </kbd>
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
