"use client"

import { useClerk, useUser } from "@clerk/nextjs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings, LogOut } from "lucide-react"

export function UserMenu() {
  const { user } = useUser()
  const { openUserProfile, signOut } = useClerk()

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : "U"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarImage src={user?.imageUrl} alt={user?.fullName ?? "User"} />
            <AvatarFallback className="bg-purple-600 text-white text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* User info header */}
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.imageUrl} alt={user?.fullName ?? "User"} />
            <AvatarFallback className="bg-purple-600 text-white text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">
              {user?.fullName ?? "User"}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {user?.primaryEmailAddress?.emailAddress ?? ""}
            </span>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onClick={() => openUserProfile()}
        >
          <Settings className="h-4 w-4" />
          Manage Account
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer gap-2 text-red-500 focus:text-red-500"
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
