"use client";

import { Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/navbar/ThemeToggle";
import { useAuth } from "@/components/auth/AuthProvider";
import { getUserDisplay } from "@/utils/userDisplay";
import { useSidebar } from "@/components/sidebar/SidebarContext";
import { useQuickAdd } from "@/components/common/QuickAddProvider";

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { toggle } = useSidebar();
  const { openPalette } = useQuickAdd();

  let title = "Dashboard";
  if (pathname.includes("transactions")) title = "Transactions";
  if (pathname.includes("settings")) title = "Settings";

  const { firstName } = getUserDisplay(user);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <header className="h-16 lg:h-20 w-full flex items-center justify-between px-4 lg:px-8 border-b border-[var(--hairline)] lg:border-b-0 sticky top-0 z-10 backdrop-blur-md bg-[var(--app-bg)]/80">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile/tablet only */}
        <button
          onClick={toggle}
          className="cursor-pointer lg:hidden p-2 rounded-lg text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
          aria-label="Toggle sidebar"
          aria-expanded={false}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-baseline gap-3">
          <h1 className="font-sora text-lg lg:text-xl font-bold text-[var(--ink)]">
            {title}
          </h1>
          {title === "Dashboard" && firstName && (
            <span className="text-sm text-[var(--ink-3)] hidden sm:inline-block">
              {greeting}, {firstName}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick-add / command palette — desktop affordance (mobile uses bottom-nav +) */}
        <button
          onClick={openPalette}
          className="hidden sm:flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--hairline)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--ink-3)] hover:text-[var(--ink)] hover:border-[var(--brand-border)] transition-colors"
          aria-label="Open quick add and search"
        >
          <Search className="h-4 w-4" />
          <span className="hidden md:inline">Quick add</span>
          <kbd className="rounded border border-[var(--hairline)] px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
