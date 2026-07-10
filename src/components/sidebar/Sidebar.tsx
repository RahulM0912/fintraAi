"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, CreditCard, MessageSquare, LogOut, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth/AuthProvider";
import { getUserDisplay } from "@/utils/userDisplay";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { name: "Transactions", href: "/transactions", icon: CreditCard },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Settings", href: "/settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const { displayName, email, avatarUrl, initials } = getUserDisplay(user);

  return (
    <aside
      className={cn(
        // Desktop-only rail. On mobile/tablet the bottom tab bar handles nav.
        "hidden lg:flex sticky top-0 z-auto w-[248px] h-screen",
        "flex-col justify-between",
        "bg-[var(--app-bg)] border-r border-[var(--hairline)]"
      )}
      aria-label="Sidebar navigation"
    >
      {/* Top: wordmark + navigation */}
      <div>
        <div className="px-8 pt-8 pb-10">
          <Link href="/" className="inline-block">
            <span className="font-display text-[22px] font-semibold tracking-tight text-[var(--ink)]">
              Fintra
            </span>
          </Link>
        </div>

        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3.5 px-8 py-3 text-sm transition-colors duration-150 ease-out",
                  isActive
                    ? "font-medium text-[var(--ink)]"
                    : "text-[var(--ink-2)] hover:text-[var(--ink)]"
                )}
              >
                {isActive && (
                  <span aria-hidden className="absolute left-0 top-1/2 h-6 -translate-y-1/2 w-0.5 bg-[var(--brand)]" />
                )}
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    isActive ? "text-[var(--brand)]" : "text-[var(--ink-3)]"
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: user menu */}
      <div className="px-6 pb-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="cursor-pointer flex w-full items-center gap-3 rounded-lg border-t border-[var(--hairline)] p-2 pt-4 text-left transition-colors duration-150 hover:bg-[var(--surface-2)]">
              <Avatar className="h-9 w-9 shrink-0 rounded-full">
                <AvatarImage src={avatarUrl} alt="" className="rounded-full" />
                <AvatarFallback className="rounded-full bg-[var(--surface-2)] text-sm font-medium text-[var(--ink)]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-[var(--ink)]">
                  {displayName}
                </span>
                <span className="truncate text-xs text-[var(--ink-3)]">{email}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[240px]">
            {/* Account management lives on the settings page — one home for it */}
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/settings">
                <SettingsIcon className="mr-2 h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-[var(--neg)] focus:text-[var(--neg)]"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
