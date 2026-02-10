"use client"

import { Moon, Sun } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <Toggle
      pressed={theme === "dark"}
      onPressedChange={(pressed) =>
        setTheme(pressed ? "dark" : "light")
      }
      className="rounded-full"
    >
      {theme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Toggle>
  )
}
