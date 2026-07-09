"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { ChevronDown, Loader2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/components/auth/AuthProvider"
import { getUserDisplay } from "@/utils/userDisplay"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/* Account management lives inline here — settings is the one home for it.
   The old ManageAccountModal (reachable from two places) is gone: a modal was
   ceremony for two form fields. Password change is rare, so it sits behind a
   quiet disclosure. */

export function ProfileSection() {
  const { user } = useAuth()
  const supabase = createClient()
  const { displayName, email, avatarUrl, initials } = getUserDisplay(user)

  const [fullName, setFullName] = useState("")
  const [savingName, setSavingName] = useState(false)

  const [passwordOpen, setPasswordOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  // Seed the name field once the user is known.
  useEffect(() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, string>
    setFullName(meta.full_name || meta.name || "")
  }, [user])

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setSavingName(true)
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    })
    setSavingName(false)
    if (error) toast.error(error.message)
    else toast.success("Name updated")
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSavingPassword(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Password updated")
      setPassword("")
      setConfirmPassword("")
      setPasswordOpen(false)
    }
  }

  return (
    <section className="border-t border-[var(--hairline)] pt-6 first:border-t-0 first:pt-0 lg:first:border-t lg:first:pt-6">
      <h2 className="mb-5 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
        Profile
      </h2>

      {/* Identity — email is read-only; it's the account key */}
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
      </div>

      {/* Display name */}
      <form onSubmit={handleSaveName} className="mt-6 max-w-md">
        <Label htmlFor="profile-name" className="text-sm">
          Display name
        </Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="profile-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            className="h-11 rounded-lg"
          />
          <Button
            type="submit"
            variant="outline"
            disabled={savingName}
            className="min-h-11 shrink-0"
          >
            {savingName && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </form>

      {/* Password — rare action, behind a quiet disclosure */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setPasswordOpen((o) => !o)}
          aria-expanded={passwordOpen}
          className="cursor-pointer inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-[var(--ink-2)] transition-colors duration-150 ease-out hover:text-[var(--ink)]"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-150 ease-out",
              passwordOpen && "rotate-180"
            )}
            aria-hidden
          />
          Change password
        </button>

        {passwordOpen && (
          <form onSubmit={handleChangePassword} className="mt-3 max-w-md space-y-4">
            <div>
              <Label htmlFor="profile-password" className="text-sm">
                New password
              </Label>
              <Input
                id="profile-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="mt-2 h-11 rounded-lg"
              />
            </div>
            <div>
              <Label htmlFor="profile-password-confirm" className="text-sm">
                Confirm new password
              </Label>
              <Input
                id="profile-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="mt-2 h-11 rounded-lg"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={savingPassword || !password}
              className="min-h-11"
            >
              {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        )}
      </div>
    </section>
  )
}
