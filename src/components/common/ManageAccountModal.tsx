"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/components/auth/AuthProvider"
import { getUserDisplay } from "@/utils/userDisplay"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

interface Props {
  open: boolean
  onClose: () => void
}

export function ManageAccountModal({ open, onClose }: Props) {
  const { user } = useAuth()
  const supabase = createClient()
  const { displayName, email, avatarUrl, initials } = getUserDisplay(user)

  const [fullName, setFullName] = useState("")
  const [savingName, setSavingName] = useState(false)

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  // Keep the name field in sync with the current user whenever the modal opens.
  useEffect(() => {
    if (open) {
      const meta = (user?.user_metadata ?? {}) as Record<string, string>
      setFullName(meta.full_name || meta.name || "")
      setPassword("")
      setConfirmPassword("")
    }
  }, [open, user])

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
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Manage Account</DialogTitle>
          <DialogDescription>
            Update your profile and password.
          </DialogDescription>
        </DialogHeader>

        {/* Identity */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-indigo-900 text-white text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground truncate">{email}</span>
          </div>
        </div>

        <Separator />

        {/* Display name */}
        <form onSubmit={handleSaveName} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="account-name">Display name</Label>
            <Input
              id="account-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={savingName}>
              {savingName && <Loader2 className="h-4 w-4 animate-spin" />}
              Save name
            </Button>
          </div>
        </form>

        <Separator />

        {/* Password */}
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="account-password">New password</Label>
            <Input
              id="account-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-password-confirm">Confirm new password</Label>
            <Input
              id="account-password-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={savingPassword || !password}
            >
              {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
