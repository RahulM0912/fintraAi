"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, CreditCard, MessageSquare, X, LogOut, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser, useClerk } from "@clerk/nextjs";
import { ManageAccountModal } from "@/components/common/ManageAccountModal";
import { useSidebar } from "@/components/sidebar/SidebarContext";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { name: "Transactions", href: "/transactions", icon: CreditCard },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Settings", href: "/settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [manageAccountOpen, setManageAccountOpen] = useState(false);
  const { isOpen, close } = useSidebar();

  const displayName =
    user?.fullName ||
    user?.firstName ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "User";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside
      className={cn(
        // Base: fixed on mobile/tablet, sticky on desktop
        "fixed inset-y-0 left-0 z-50 w-[280px] h-screen",
        "lg:sticky lg:top-0 lg:z-auto",
        // Layout
        "flex flex-col justify-between",
        // Visual
        "bg-[var(--surface)] border-r border-[var(--hairline)]",
        // Slide transition for mobile/tablet
        "transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
      aria-label="Sidebar navigation"
    >
      {/* Close button — mobile/tablet only */}
      <button
        onClick={close}
        className="cursor-pointer absolute top-4 right-4 lg:hidden p-2 rounded-lg text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
        aria-label="Close sidebar"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Top: Logo + Navigation */}
      <div>
        <div className="p-8 pb-12 text-left">
          <Link href="/" className="flex flex-col gap-1" onClick={close}>
            <h1 className="font-sora text-xl font-bold text-[var(--brand)]">
              Fintra
            </h1>
            <p className="text-[10px] font-semibold text-[var(--ink-3)] tracking-widest uppercase mt-1">
              AI-powered expense tracker
            </p>
          </Link>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={close}
                className={cn(
                  "flex items-center gap-4 px-8 py-3 text-sm font-medium transition-colors relative",
                  isActive
                    ? "text-[var(--brand)] bg-[var(--brand-bg)]"
                    : "text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--brand)] rounded-r" />
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

      {/* Bottom: User menu */}
      <div className="px-8 pb-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--hairline)] cursor-pointer hover:bg-[var(--surface-2)] rounded-lg p-2 transition-colors -mx-2">
              <Avatar className="h-9 w-9 rounded-xl shrink-0">
                <AvatarImage src={user?.imageUrl} alt={displayName} className="rounded-xl" />
                <AvatarFallback className="bg-[var(--brand)] text-white rounded-xl text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-sm font-semibold text-[var(--ink)] truncate">
                  {displayName}
                </span>
                <span className="text-[10px] text-[var(--ink-2)] truncate">
                  {user?.emailAddresses?.[0]?.emailAddress}
                </span>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[240px]">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => setManageAccountOpen(true)}
            >
              <SettingsIcon className="mr-2 h-4 w-4" /> Manage Account
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-red-500 hover:text-red-600 focus:text-red-600"
              onClick={() => signOut(() => router.push("/"))}
            >
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ManageAccountModal
        open={manageAccountOpen}
        onClose={() => setManageAccountOpen(false)}
      />
    </aside>
  );
}
