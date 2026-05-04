"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/navbar/ThemeToggle";
import { useUser } from "@clerk/nextjs";
import { useSidebar } from "@/components/sidebar/SidebarContext";

export function Header() {
  const pathname = usePathname();
  const { user } = useUser();
  const { toggle } = useSidebar();

  let title = "Dashboard";
  if (pathname.includes("transactions")) title = "Transactions";
  if (pathname.includes("settings")) title = "Settings";

  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || null;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <header className="h-16 lg:h-20 w-full flex items-center justify-between px-4 lg:px-8 bg-transparent border-b border-gray-100 dark:border-zinc-800 lg:border-b-0 sticky top-0 z-10 backdrop-blur-sm bg-gray-50/80 dark:bg-zinc-950/80">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile/tablet only */}
        <button
          onClick={toggle}
          className="cursor-pointer lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:hover:text-gray-200 transition-colors"
          aria-label="Toggle sidebar"
          aria-expanded={false}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <h1 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
          {title === "Dashboard" && firstName && (
            <span className="text-sm text-gray-400 hidden sm:inline-block">
              {greeting}, {firstName}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        <ThemeToggle />
      </div>
    </header>
  );
}
