import Link from "next/link"
import { NavLinks } from "./NavLinks"
import { ThemeToggle } from "./ThemeToggle"
import { UserMenu } from "./UserMenu"

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        
        {/* Left */}
        <div className="flex items-center gap-8">
          <Link href="/" className="font-sora flex items-center gap-2 text-xl font-bold text-[var(--brand)]">
            Fintra
          </Link>

          <NavLinks />
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          {/* <button className="hidden sm:inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
            <span className="mr-2">✨</span> Ask AI
          </button> */}
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
