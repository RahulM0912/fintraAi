"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, CreditCard, MessageSquare, Settings, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useQuickAdd } from "@/components/common/QuickAddProvider"

const tabs = [
  { name: "Home", href: "/dashboard", icon: LayoutGrid },
  { name: "Activity", href: "/transactions", icon: CreditCard },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()
  const { openAdd } = useQuickAdd()

  return (
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[var(--hairline)] bg-[var(--surface)]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="grid h-16 grid-cols-5 items-center">
        {tabs.slice(0, 2).map((t) => (
          <Tab key={t.href} {...t} active={isActive(pathname, t.href)} />
        ))}

        {/* Center add — opens the transaction modal directly (palette is desktop ⌘K) */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => openAdd("expense")}
            aria-label="Add transaction"
            className="cursor-pointer -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] text-[var(--primary-foreground)] shadow-sm transition-transform duration-150 ease-out active:scale-95"
          >
            <Plus className="h-6 w-6" aria-hidden />
          </button>
        </div>

        {tabs.slice(2).map((t) => (
          <Tab key={t.href} {...t} active={isActive(pathname, t.href)} />
        ))}
      </div>
    </nav>
  )
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href)
}

function Tab({
  name,
  href,
  icon: Icon,
  active,
}: {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150 ease-out",
        active ? "text-[var(--brand)]" : "text-[var(--ink-3)]"
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
      {name}
    </Link>
  )
}
