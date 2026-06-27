"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { getUserDisplay } from "@/utils/userDisplay"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings, LogOut } from "lucide-react"
import { ManageAccountModal } from "@/components/common/ManageAccountModal"

export function UserMenu() {
  const { user, signOut } = useAuth()
  const { displayName, email, avatarUrl, initials } = getUserDisplay(user)
  const [manageAccountOpen, setManageAccountOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-[var(--brand)] text-white text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {/* User info header */}
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-[var(--brand)] text-white text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">{displayName}</span>
              <span className="text-xs text-muted-foreground truncate">
                {email}
              </span>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => setManageAccountOpen(true)}
          >
            <Settings className="h-4 w-4" />
            Manage Account
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="cursor-pointer gap-2 text-red-500 focus:text-red-500"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ManageAccountModal
        open={manageAccountOpen}
        onClose={() => setManageAccountOpen(false)}
      />
    </>
  )
}
