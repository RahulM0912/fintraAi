"use client";

import { Bell, Wallet, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/navbar/ThemeToggle";
import { useUser } from "@clerk/nextjs";

export function Header() {
  const pathname = usePathname();
  const { user } = useUser();

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
    <header className="h-20 w-full flex items-center justify-between px-8 bg-transparent">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h1>
        {title === "Dashboard" && firstName && (
          <span className="text-sm text-gray-400 mt-1 hidden sm:inline-block">
            {greeting}, {firstName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        {/* <button className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 transition-colors">
          <Bell className="h-5 w-5" />
        </button>
        <button className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 transition-colors">
          <Wallet className="h-5 w-5" />
        </button> */}
        {/* <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-100/50 dark:border-indigo-900/50 shadow-sm">
          <Sparkles className="h-4 w-4" /> Ask AI
        </button> */}
        <ThemeToggle />
      </div>
    </header>
  );
}
