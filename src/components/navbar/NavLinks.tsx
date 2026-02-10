"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const links = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Transactions", href: "/transactions" },
  { name: "Chat", href: "/chat" },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-6 text-sm">
      {links.map((link) => {
        const isActive = pathname === link.href

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "transition",
              // Base (light mode)
              "text-gray-600 hover:text-black",
              // Dark mode
              "dark:text-gray-400 dark:hover:text-white",
              // Active state
              isActive &&
                "text-black border-b-2 border-black pb-1 dark:text-white dark:border-white"
            )}
          >
            {link.name}
          </Link>
        )
      })}
    </nav>
  )
}
