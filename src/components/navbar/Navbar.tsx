import Link from "next/link"
import { NavLinks } from "./NavLinks"
import { ThemeToggle } from "./ThemeToggle"
import { UserMenu } from "./UserMenu"

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        
        {/* Left */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-yellow-400">
            🐷 BudgetTracker
          </Link>

          <NavLinks />
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
