"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { getUserDisplay } from "@/utils/userDisplay"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/navbar/ThemeToggle"
import { ManageAccountModal } from "@/components/common/ManageAccountModal"
import { RecurringSection } from "@/components/settings/RecurringSection"
import { AiSettingsSection } from "@/components/settings/AiSettingsSection"
import { DataSection } from "@/components/settings/DataSection"
import { LogOut, Palette, UserRound } from "lucide-react"

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const [manageOpen, setManageOpen] = useState(false)

  const { displayName, email, avatarUrl, initials } = getUserDisplay(user)

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5 lg:pb-8">
      {/* Mobile gets the title from the app header */}
      <div className="hidden lg:block">
        <h1 className="font-sora text-[26px] font-bold tracking-tight text-[var(--ink)]">
          Settings
        </h1>
        <p className="text-sm text-[var(--ink-2)] mt-0.5">
          Manage your account, appearance, and AI preferences.
        </p>
      </div>

      {/* Profile */}
      <Section icon={UserRound} title="Profile">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 rounded-xl shrink-0">
            <AvatarImage src={avatarUrl} alt={displayName} className="rounded-xl" />
            <AvatarFallback className="bg-[var(--brand)] text-white rounded-xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[var(--ink)] truncate">{displayName}</p>
            <p className="text-sm text-[var(--ink-3)] truncate">{email}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setManageOpen(true)}
            className="shrink-0"
          >
            Manage account
          </Button>
        </div>
      </Section>

      {/* Appearance */}
      <Section icon={Palette} title="Appearance">
        <Row title="Theme" desc="Switch between light and dark mode.">
          <ThemeToggle />
        </Row>
      </Section>

      {/* AI */}
      <AiSettingsSection />

      {/* Recurring */}
      <RecurringSection />

      {/* Data */}
      <DataSection />

      {/* Sign out */}
      <button
        onClick={() => signOut()}
        className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] px-5 py-3.5 text-sm font-semibold text-[var(--neg)] transition-colors hover:bg-[var(--neg-bg)]"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>

      <p className="text-center text-xs text-[var(--ink-3)] pt-2">Fintra · v0.1</p>

      <ManageAccountModal open={manageOpen} onClose={() => setManageOpen(false)} />
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--ink-3)]" />
        <h2 className="font-sora text-sm font-semibold text-[var(--ink)]">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Row({
  title,
  desc,
  children,
}: {
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--ink)]">{title}</p>
        <p className="text-xs text-[var(--ink-3)] mt-0.5">{desc}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
