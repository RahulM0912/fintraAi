"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { ThemeToggle } from "@/components/navbar/ThemeToggle"
import { ProfileSection } from "@/components/settings/ProfileSection"
import { RecurringSection } from "@/components/settings/RecurringSection"
import { AiSettingsSection } from "@/components/settings/AiSettingsSection"
import { DataSection } from "@/components/settings/DataSection"
import { InstallSection } from "@/components/settings/InstallSection"
import { LogOut } from "lucide-react"

export default function SettingsPage() {
  const { signOut } = useAuth()

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
        {/* Profile — account management lives inline here, the one home for it */}
        <ProfileSection />

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

        {/* Install as app (PWA) */}
        <InstallSection />

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
