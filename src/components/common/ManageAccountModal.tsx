"use client"

import { UserProfile } from "@clerk/nextjs"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

interface Props {
  open: boolean
  onClose: () => void
}

export function ManageAccountModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] p-0 overflow-x-hidden overflow-y-auto rounded-2xl border shadow-xl">
        <DialogTitle className="sr-only">Manage Account</DialogTitle>
        <UserProfile routing="hash" />
      </DialogContent>
    </Dialog>
  )
}
