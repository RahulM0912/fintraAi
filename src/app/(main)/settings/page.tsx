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
import { LogOut } from "lucide-react"

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const [manageOpen, setManageOpen] = useState(false)

  const { displayName, email, avatarUrl, initials } = getUserDisplay(user)

  return (
    <div className="mx-auto max-w-3xl px-5 pt-6 pb-12 sm:px-8 lg:pt-12 lg:pb-16">
      {/* Mobile gets the title from the app header */}
      <div className="hidden lg:block">
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-px w-6 bg-[var(--brand)]" />
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
            Preferences
          </p>
        </div>
        <h1 className="font-display mt-3 text-[32px] font-semibold tracking-tight text-[var(--ink)]">
          Settings
        </h1>
      </div>

      <div className="mt-0 space-y-10 lg:mt-10">
        {/* Profile */}
        <Section title="Profile">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 shrink-0 rounded-full">
              <AvatarImage src={avatarUrl} alt="" className="rounded-full" />
              <AvatarFallback className="rounded-full bg-[var(--surface-2)] font-medium text-[var(--ink)]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-[var(--ink)]">{displayName}</p>
              <p className="truncate text-sm text-[var(--ink-3)]">{email}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setManageOpen(true)}
              className="min-h-11 shrink-0"
            >
              Manage account
            </Button>
          </div>
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <Row title="Theme" desc="Switch between light and dark.">
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
        <div className="border-t border-[var(--hairline)] pt-6">
          <button
            onClick={() => signOut()}
            className="cursor-pointer inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--hairline-strong)] px-5 text-sm font-medium text-[var(--neg)] transition-colors duration-150 ease-out hover:border-[var(--neg)] hover:bg-[var(--neg-bg)]"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      </div>

      <p className="pt-10 text-xs text-[var(--ink-3)]">Fintra · v0.1</p>

      <ManageAccountModal open={manageOpen} onClose={() => setManageOpen(false)} />
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-[var(--hairline)] pt-6 first:border-t-0 first:pt-0 lg:first:border-t lg:first:pt-6">
      <h2 className="mb-5 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
        {title}
      </h2>
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
        <p className="mt-0.5 text-xs text-[var(--ink-3)]">{desc}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
