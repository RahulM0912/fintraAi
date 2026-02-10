"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TransactionModal } from "./TransactionModal"

export default function TransactionButtonGroup() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<"income" | "expense">("income")

  return (
    <>
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => {
            setType("income")
            setOpen(true)
          }}
        >
          New income
        </Button>

        <Button
          variant="destructive"
          onClick={() => {
            setType("expense")
            setOpen(true)
          }}
        >
          New expense
        </Button>
      </div>

      <TransactionModal
        open={open}
        onOpenChange={setOpen}
        type={type}
        onSuccess={(created) => {
          // call dashboard refresh or toast
          console.log("created", created)
          // e.g. useDashboardStore.getState().loadSummary(...)
        }}
      />
    </>
  )
}
